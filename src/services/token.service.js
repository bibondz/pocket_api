const axios = require('axios');
const { PB_URL } = require('../../config');

class TokenService {
    constructor(authToken) {
        this.baseUrl = PB_URL;
        this.authToken = authToken;
        if (!this.authToken) {
            throw new Error('Auth token is required');
        }
    }

    async createToken(data) {
        const response = await axios.post(
            `${this.baseUrl}/api/collections/tank_tokens/records`,
            data,
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
        return response.data;
    }

    async listTokens() {
        const response = await axios.get(
            `${this.baseUrl}/api/collections/tank_tokens/records`,
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
        return response.data;
    }

    async getToken(tokenId) {
        const response = await axios.get(
            `${this.baseUrl}/api/collections/tank_tokens/records/${tokenId}`,
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
        return response.data;
    }

    async deleteToken(tokenId) {
        await axios.delete(
            `${this.baseUrl}/api/collections/tank_tokens/records/${tokenId}`,
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
    }
}

module.exports = { TokenService }; 