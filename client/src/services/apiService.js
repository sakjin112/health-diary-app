//handles all communication with flask backend

const BASE_URL = 'http://localhost:5001/api';

class ApiService {
  
  // Helper method to handle HTTP responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Test if backend is running
  async healthCheck() {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Create a new diary entry
  async createEntry(diaryText, entryDate = null) {
    try {
      const requestBody = {
        text: diaryText,
        date: entryDate || new Date().toLocaleDateString()
      };

      console.log('📤 Sending entry to backend:', requestBody);

      const response = await fetch(`${BASE_URL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await this.handleResponse(response);
      console.log('✅ Entry saved successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to create entry:', error);
      throw error;
    }
  }

  // Get diary entries with optional filtering
  async getEntries(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.limit) params.append('limit', options.limit.toString());

      const url = `${BASE_URL}/entries${params.toString() ? '?' + params.toString() : ''}`;
      
      console.log('📥 Fetching entries from:', url);

      const response = await fetch(url);
      const result = await this.handleResponse(response);
      
      console.log(`✅ Fetched ${result.entries.length} entries`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch entries:', error);
      throw error;
    }
  }

  // Get health analytics summary
  async getHealthSummary(days = 30) {
    try {
      const response = await fetch(`${BASE_URL}/analytics/summary?days=${days}`);
      const result = await this.handleResponse(response);
      
      console.log('📊 Health summary fetched:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch health summary:', error);
      throw error;
    }
  }

  // Get entries for a specific date (for calendar)
  async getEntriesForDate(date) {
    try {
      const result = await this.getEntries({
        startDate: date,
        endDate: date
      });
      return result.entries;
    } catch (error) {
      console.error(`❌ Failed to fetch entries for ${date}:`, error);
      throw error;
    }
  }

  // Convert backend entry format to your current React format
  convertBackendEntry(backendEntry) {
    console.log('🔄 Converting backend entry:', backendEntry);
    
    // Create a proper Date object and format time
    const createdDate = new Date(backendEntry.created_at);
    const entryDate = backendEntry.entry_date;
    
    console.log('📅 Entry date from backend:', entryDate);
    console.log('📅 Created date from backend:', backendEntry.created_at);
    
    const convertedEntry = {
      id: backendEntry.id,
      text: backendEntry.entry_text,
      date: this.formatDateForReact(entryDate), // Convert to your expected format
      time: createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      
      // Convert AI scores to your original format
      mood: this.mapMoodScore(backendEntry.mood_score),
      energy: backendEntry.energy_level,
      painLevel: backendEntry.pain_level,
      sleepQuality: backendEntry.sleep_quality,
      sleepHours: backendEntry.sleep_hours,
      stressLevel: backendEntry.stress_level,
      
      // Symptoms (placeholder for now, will implement properly later)
      symptoms: this.extractSymptomsFromAI(backendEntry),
      
      // AI metadata
      aiConfidence: backendEntry.ai_confidence || 0,
      
      // Additional AI data for debugging
      aiData: {
        moodScore: backendEntry.mood_score,
        energyLevel: backendEntry.energy_level,
        painLevel: backendEntry.pain_level,
        sleepQuality: backendEntry.sleep_quality,
        sleepHours: backendEntry.sleep_hours,
        stressLevel: backendEntry.stress_level
      }
    };
    
    console.log('✅ Converted entry:', convertedEntry);
    return convertedEntry;
  }

  // Format date to match your React component expectations
  formatDateForReact(dateString) {
    console.log('🔄 formatDateForReact input:', dateString, 'type:', typeof dateString);
    
    // Handle null/undefined dates
    if (!dateString) {
      console.log('❌ Date string is null/undefined, using today');
      return new Date().toLocaleDateString();
    }
    
    // Create date object - handle different formats from backend
    let date;
    
    if (dateString.includes('GMT') || dateString.includes('T')) {
      // Backend sends full date strings like "Sun, 08 Jun 2025 00:00:00 GMT"
      date = new Date(dateString);
    } else {
      // Simple format like "2024-06-06"
      date = new Date(dateString + 'T00:00:00');
    }
    
    console.log('📅 Created date object:', date);
    
    if (isNaN(date.getTime())) {
      console.log('❌ Invalid date created, using today instead');
      return new Date().toLocaleDateString();
    }
    
    const formatted = date.toLocaleDateString();
    console.log(`✅ Date conversion: "${dateString}" → "${formatted}"`);
    return formatted;
  }

  // Map AI mood score (1-10) to your current mood categories
  mapMoodScore(score) {
    if (!score) return 'neutral';
    if (score >= 7) return 'positive';
    if (score <= 4) return 'negative';
    return 'neutral';
  }

  // Extract symptoms from AI data (enhanced)
  extractSymptomsFromAI(backendEntry) {
    const symptoms = [];
    
    // Add pain-related symptoms
    if (backendEntry.pain_level && backendEntry.pain_level > 3) {
      symptoms.push('pain');
    }
    
    // Add fatigue if low energy
    if (backendEntry.energy_level && backendEntry.energy_level < 4) {
      symptoms.push('fatigue');
    }
    
    // Add sleep issues
    if (backendEntry.sleep_quality && backendEntry.sleep_quality < 4) {
      symptoms.push('sleep issues');
    }
    
    // Add stress if high
    if (backendEntry.stress_level && backendEntry.stress_level > 6) {
      symptoms.push('stress');
    }
    
    // TODO: Later we'll get actual symptoms from the database relationships
    return symptoms;
  }

    // Delete a specific entry
    async deleteEntry(entryId) {
        try {
        console.log(`🗑️ Deleting entry ${entryId}...`);
        
        const response = await fetch(`${BASE_URL}/entries/${entryId}`, {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            }
        });
    
        const result = await this.handleResponse(response);
        console.log('✅ Entry deleted successfully:', result);
        return result;
        
        } catch (error) {
        console.error('❌ Failed to delete entry:', error);
        throw error;
        }
    }

    // Clear ALL entries (use with extreme caution!)
    async clearAllEntries() {
        try {
        console.log('🚨 Clearing ALL entries...');
        
        const response = await fetch(`${BASE_URL}/entries/clear-all`, {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            }
        });
    
        const result = await this.handleResponse(response);
        console.log('✅ All entries cleared successfully:', result);
        return result;
        
        } catch (error) {
        console.error('❌ Failed to clear all entries:', error);
        throw error;
        }
    }
  
  // Delete multiple entries at once
  async bulkDeleteEntries(entryIds) {
    try {
      console.log(`🗑️ Bulk deleting ${entryIds.length} entries...`);
      
      const response = await fetch(`${BASE_URL}/entries/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entry_ids: entryIds })
      });
  
      const result = await this.handleResponse(response);
      console.log('✅ Bulk delete successful:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to bulk delete entries:', error);
      throw error;
    }
  }
  
  // Check if an entry is a demo entry (starts with 'demo_')
  isDemoEntry(entryId) {
    return String(entryId).startsWith('demo_');
  }

}

// Export a singleton instance
export default new ApiService();