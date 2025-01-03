const PocketBase = require('pocketbase/cjs');

class PBAuthService {
    constructor() {
        // Make sure URL has http:// prefix
        let pbUrl = process.env.PB_URL || 'localhost:5050';
        if (!pbUrl.startsWith('http://') && !pbUrl.startsWith('https://')) {
            pbUrl = `http://${pbUrl}`;
        }
        console.log('Auth service - PocketBase URL:', pbUrl);
        
        // Initialize PocketBase with base URL
        this.pb = new PocketBase(pbUrl);
        
        // Set base URL explicitly
        this.pb.baseUrl = pbUrl;
        console.log('PocketBase base URL:', this.pb.baseUrl);
    }

    async register(data) {
        try {
            const { email, password, passwordConfirm, name, role, department } = data;
            
            // Validate required fields
            if (!email || !password || !passwordConfirm || !name) {
                return {
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                };
            }

            // Check if passwords match
            if (password !== passwordConfirm) {
                return {
                    success: false,
                    message: 'รหัสผ่านไม่ตรงกัน'
                };
            }

            // Validate password strength
            if (password.length < 8) {
                return {
                    success: false,
                    message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    message: 'รูปแบบอีเมลไม่ถูกต้อง'
                };
            }

            console.log('Creating user with data:', {
                email,
                name,
                role,
                department,
                status: 'active',
                emailVisibility: true
            });

            // Create user with default active status
            const record = await this.pb.collection('users').create({
                email,
                password,
                passwordConfirm,
                name,
                role: role || 'operator',
                status: 'active',
                department,
                emailVisibility: true
            });

            console.log('User created:', record);

            // After successful registration, login automatically
            return await this.auth(email, password);

        } catch (error) {
            console.error('Registration error:', error);
            
            // Log full error details for debugging
            console.error('Error details:', {
                status: error.status,
                data: error.response?.data,
                message: error.message,
                originalError: error.originalError,
                fullError: JSON.stringify(error, null, 2)
            });

            // Check for duplicate email error
            const emailError = error.response?.data?.email || error.response?.data?.data?.email;
            if (emailError) {
                if (emailError.message?.includes('already in use')) {
                    return {
                        success: false,
                        message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น',
                        details: { email: emailError }
                    };
                }
                return {
                    success: false,
                    message: emailError.message || 'รูปแบบอีเมลไม่ถูกต้อง',
                    details: { email: emailError }
                };
            }

            // Return error message from PocketBase if available
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
                details: error.response?.data || {}
            };
        }
    }

    async auth(identity, password) {
        try {
            console.log('Attempting login for user:', identity);
            console.log('Auth URL:', this.pb.authStore.baseUrl);
            
            const authData = await this.pb.collection('users').authWithPassword(
                identity,
                password
            );
            
            console.log('Login successful, auth data:', authData);
            
            if (!authData?.record) {
                throw new Error('Invalid response from auth service');
            }

            return {
                success: true,
                token: this.pb.authStore.token,
                user: authData.record
            };
        } catch (error) {
            console.error('Auth error:', error);
            console.error('Error details:', {
                status: error.status,
                url: error.url,
                response: error.response,
                data: error.response?.data,
                originalError: error.originalError
            });
            
            // Check specific error types
            if (error.status === 400) {
                return {
                    success: false,
                    message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
                };
            }
            
            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
            };
        }
    }

    async requestEmailChange(newEmail) {
        try {
            if (!this.pb.authStore.isValid) {
                return {
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนอีเมล'
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                return {
                    success: false,
                    message: 'รูปแบบอีเมลไม่ถูกต้อง'
                };
            }

            await this.pb.collection('_pb_users_auth_').requestEmailChange(newEmail);
            
            return {
                success: true,
                message: 'ส่งคำขอเปลี่ยนอีเมลแล้ว กรุณาตรวจสอบอีเมลของคุณ'
            };
        } catch (error) {
            console.error('Request email change error:', error);
            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการขอเปลี่ยนอีเมล'
            };
        }
    }

    getClientWithToken(token) {
        const pb = new PocketBase(PB_URL);
        pb.authStore.save(token);
        return pb;
    }

    isValid() {
        return this.pb.authStore.isValid;
    }

    getToken() {
        return this.pb.authStore.token;
    }

    clearAuth() {
        this.pb.authStore.clear();
    }

    async requestPasswordReset(email) {
        try {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    message: 'รูปแบบอีเมลไม่ถูกต้อง'
                };
            }

            await this.pb.collection('_pb_users_auth_').requestPasswordReset(email);
            
            return {
                success: true,
                message: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ'
            };
        } catch (error) {
            console.error('Request password reset error:', error);
            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน'
            };
        }
    }

    async confirmPasswordReset(token, password, passwordConfirm) {
        try {
            // Validate password
            if (password.length < 8) {
                return {
                    success: false,
                    message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
                };
            }

            // Check if passwords match
            if (password !== passwordConfirm) {
                return {
                    success: false,
                    message: 'รหัสผ่านไม่ตรงกัน'
                };
            }

            await this.pb.collection('_pb_users_auth_').confirmPasswordReset(token, password, passwordConfirm);
            
            return {
                success: true,
                message: 'รีเซ็ตรหัสผ่านสำเร็จ'
            };
        } catch (error) {
            console.error('Confirm password reset error:', error);
            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
            };
        }
    }

    async refreshToken() {
        try {
            // Use PocketBase's built-in refresh
            const result = await this.pb.collection('users').authRefresh();
            
            if (!this.pb.authStore.isValid) {
                return {
                    success: false,
                    message: 'Token refresh failed'
                };
            }

            return {
                success: true,
                token: this.pb.authStore.token,
                user: result.record
            };
        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                message: error.message || 'Token refresh failed'
            };
        }
    }
}

module.exports = PBAuthService; 