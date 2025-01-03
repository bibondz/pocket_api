const axios = require('axios');
const { PB_URL } = require('../../config');

class DepartmentManagerService {
    constructor(authToken, departmentId) {
        this.baseUrl = PB_URL;
        this.authToken = authToken;
        this.departmentId = departmentId;
        if (!this.authToken) {
            throw new Error('Auth token is required');
        }
        if (!this.departmentId) {
            throw new Error('Department ID is required');
        }
    }

    async addMembers(data) {
        const { userIds, role, tank_permission } = data;
        const results = [];

        for (const userId of userIds) {
            const response = await axios.post(
                `${this.baseUrl}/api/collections/department_user_access/records`,
                {
                    user: userId,
                    department: this.departmentId,
                    role: role,
                    tank_permissions: tank_permission || {}
                },
                { headers: { 'Authorization': `Bearer ${this.authToken}` } }
            );
            results.push(response.data);
        }

        return results[0]; // Return first result for backward compatibility
    }

    async listMembers() {
        const response = await axios.get(
            `${this.baseUrl}/api/collections/department_user_access/records`,
            {
                params: { filter: `department = "${this.departmentId}"` },
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            }
        );
        return response.data;
    }

    async updateMember(userId, data) {
        const { role, tank_permission } = data;
        
        const accessRecord = await axios.get(
            `${this.baseUrl}/api/collections/department_user_access/records`,
            {
                params: { filter: `user = "${userId}" && department = "${this.departmentId}"` },
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            }
        );

        if (!accessRecord.data.items || accessRecord.data.items.length === 0) {
            throw new Error('Member not found in department');
        }

        const response = await axios.patch(
            `${this.baseUrl}/api/collections/department_user_access/records/${accessRecord.data.items[0].id}`,
            {
                role: role,
                tank_permissions: tank_permission || {}
            },
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
        return response.data;
    }

    async removeMember(userId) {
        const accessRecord = await axios.get(
            `${this.baseUrl}/api/collections/department_user_access/records`,
            {
                params: { filter: `user = "${userId}" && department = "${this.departmentId}"` },
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            }
        );

        if (!accessRecord.data.items || accessRecord.data.items.length === 0) {
            throw new Error('Member not found in department');
        }

        await axios.delete(
            `${this.baseUrl}/api/collections/department_user_access/records/${accessRecord.data.items[0].id}`,
            { headers: { 'Authorization': `Bearer ${this.authToken}` } }
        );
    }
}

module.exports = DepartmentManagerService; 