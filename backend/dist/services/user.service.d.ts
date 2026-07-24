export interface UserProfileData {
    id: string;
    name: string;
    email: string;
    age: number;
    income: number;
    dependents: number;
    maritalStatus: 'Single' | 'Married';
    occupation: string;
    city: string;
    isLoggedIn: boolean;
}
export declare class UserService {
    static getUserProfile(): UserProfileData;
    static updateUserProfile(data: Partial<UserProfileData>): UserProfileData;
    static authenticate(email: string, name?: string): UserProfileData;
    static processOnboarding(onboardingData: Record<string, unknown>): {
        success: boolean;
        user: UserProfileData;
        message: string;
    };
}
