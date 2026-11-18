import { secureApi } from '../utils/apiConfig';

export const recurringService = {
  /**
   * Fetch all recurring transactions for current user.
   */
  async getRecurringTransactions() {
    const response = await secureApi.get('/api/recurring');
    return response.data;
  },

  /**
   * Fetch single recurring transaction by ID.
   */
  async getRecurringTransaction(id) {
    const response = await secureApi.get(`/api/recurring/${id}`);
    return response.data;
  },

  /**
   * Create a new recurring transaction schedule.
   */
  async createRecurringTransaction(data) {
    const response = await secureApi.post('/api/recurring', data);
    return response.data;
  },

  /**
   * Update an existing recurring transaction schedule.
   */
  async updateRecurringTransaction(id, data) {
    const response = await secureApi.put(`/api/recurring/${id}`, data);
    return response.data;
  },

  /**
   * Toggle between ACTIVE and PAUSED.
   */
  async toggleRecurringTransaction(id) {
    const response = await secureApi.patch(`/api/recurring/${id}/toggle`);
    return response.data;
  },

  /**
   * Delete recurring transaction schedule.
   */
  async deleteRecurringTransaction(id) {
    const response = await secureApi.delete(`/api/recurring/${id}`);
    return response.data;
  },

  /**
   * Manually trigger on-demand execution.
   */
  async runNow(id = null) {
    const endpoint = id ? `/api/recurring/${id}/run-now` : '/api/recurring/run-now';
    const response = await secureApi.post(endpoint);
    return response.data;
  }
};

export default recurringService;
