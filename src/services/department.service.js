const BaseService = require('./base.service');

class DepartmentService extends BaseService {
    constructor(auth = {}) {
        super(auth);
    }

    // ดึงข้อมูลแผนกทั้งหมด
    async list() {
        try {
            const options = {
                sort: '-created',
                expand: 'manager' // expand manager field
            };

            // ถ้าไม่ใช่ admin จะเห็นเฉพาะแผนกที่เกี่ยวข้อง
            if (!this.isAdmin) {
                const filter = [];
                
                // แผนกที่เป็นสมาชิก
                if (this.department) {
                    filter.push(`id = "${this.department}"`);
                }
                
                // แผนกที่ไป็นผู้จัดการ
                filter.push(`manager ?~ "${this.record.id}"`);
                
                // แผนกที่ได้รับสิทธิ์เพิ่มเติม
                const access = await this.pb.collection('department_user_access').getFullList({
                    filter: `user = "${this.record.id}"`
                });
                
                if (access.length > 0) {
                    const deptIds = access.map(a => a.department);
                    filter.push(`id = "${deptIds.join('" || id = "')}"`);
                }

                if (filter.length > 0) {
                    options.filter = filter.join(' || ');
                }
            }

            const departments = await this.pb.collection('departments').getFullList(options);
            return {
                success: true,
                data: departments.map(dept => ({
                    id: dept.id,
                    name: dept.name,
                    description: dept.description,
                    location: dept.location,
                    managers: dept.expand?.manager ? dept.manager.map(managerId => ({
                        id: managerId,
                        name: dept.expand.manager.find(m => m.id === managerId)?.name,
                        email: dept.expand.manager.find(m => m.id === managerId)?.email
                    })) : [],
                    created: dept.created,
                    updated: dept.updated
                }))
            };
        } catch (error) {
            console.error('List departments error:', error);
            return { success: false, error: error.message };
        }
    }

    // ดึงข้อมูลแผนกเดียว
    async getById(departmentId) {
        try {
            const department = await this.pb.collection('departments').getOne(departmentId, {
                expand: 'manager'
            });

            // เช็คสิทธิ์การเข้าถึง
            if (!this.isAdmin) {
                const isManager = department.manager.includes(this.record.id);
                const access = await this.pb.collection('department_user_access').getFirstListItem(
                    `user = "${this.record.id}" && department = "${departmentId}"`
                ).catch(() => null);

                if (!access && !isManager && this.department !== departmentId) {
                    throw new Error('You do not have access to this department');
                }
            }

            return {
                success: true,
                data: {
                    id: department.id,
                    name: department.name,
                    description: department.description,
                    location: department.location,
                    managers: department.expand?.manager ? department.manager.map(managerId => ({
                        id: managerId,
                        name: department.expand.manager.find(m => m.id === managerId)?.name,
                        email: department.expand.manager.find(m => m.id === managerId)?.email
                    })) : [],
                    created: department.created,
                    updated: department.updated
                }
            };
        } catch (error) {
            console.error('Get department error:', error);
            return { success: false, error: error.message };
        }
    }

    // สร้างแผนกใหม่ (admin only)
    async create(data) {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can create departments');
            }

            const department = await this.pb.collection('departments').create({
                name: data.name,
                description: data.description || '',
                location: data.location || '',
                manager: data.managerIds || []
            });

            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Create department error:', error);
            return { success: false, error: error.message };
        }
    }

    // อัพเดทแผนก (admin only)
    async update(departmentId, data) {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can update departments');
            }

            const department = await this.pb.collection('departments').update(departmentId, {
                name: data.name,
                description: data.description,
                location: data.location,
                manager: data.managerIds
            });

            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Update department error:', error);
            return { success: false, error: error.message };
        }
    }

    // เพิ่มผู้จัดการแผนก
    async addManager(departmentId, userId) {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can add department managers');
            }

            const department = await this.pb.collection('departments').getOne(departmentId);
            const managers = [...department.manager, userId];

            const result = await this.pb.collection('departments').update(departmentId, {
                manager: managers
            });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Add manager error:', error);
            return { success: false, error: error.message };
        }
    }

    // ลบผู้จัดการแผนก
    async removeManager(departmentId, userId) {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can remove department managers');
            }

            const department = await this.pb.collection('departments').getOne(departmentId);
            const managers = department.manager.filter(id => id !== userId);

            if (managers.length === 0) {
                throw new Error('Department must have at least one manager');
            }

            const result = await this.pb.collection('departments').update(departmentId, {
                manager: managers
            });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Remove manager error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = DepartmentService; 