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

let currentUser: UserProfileData = {
  id: 'USR-7701',
  name: 'Alex Vance',
  email: 'alex.vance@shieldiq.internal',
  age: 34,
  income: 145000,
  dependents: 2,
  maritalStatus: 'Married',
  occupation: 'Senior Systems Architect',
  city: 'San Francisco, CA',
  isLoggedIn: true,
};

export class UserService {
  static getUserProfile(): UserProfileData {
    return currentUser;
  }

  static updateUserProfile(data: Partial<UserProfileData>): UserProfileData {
    currentUser = { ...currentUser, ...data };
    return currentUser;
  }

  static authenticate(email: string, name?: string): UserProfileData {
    currentUser = {
      ...currentUser,
      email,
      name: name || currentUser.name,
      isLoggedIn: true,
    };
    return currentUser;
  }

  static processOnboarding(onboardingData: Record<string, unknown>): {
    success: boolean;
    user: UserProfileData;
    message: string;
  } {
    if (typeof onboardingData.age === 'number') currentUser.age = onboardingData.age;
    if (typeof onboardingData.income === 'number') currentUser.income = onboardingData.income;
    if (typeof onboardingData.dependents === 'number') currentUser.dependents = onboardingData.dependents;

    return {
      success: true,
      user: currentUser,
      message: 'Onboarding data processed and baseline actuarial risk profile initialized.',
    };
  }
}
