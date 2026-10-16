import type { UserProfile } from './AppContext';

export type DependentRelation = 'child' | 'parent' | 'sibling';
export interface Dependent {
  relation: DependentRelation;
  age: number;
}

/** Education funding stops once a dependent is past college age (matches the backend). */
export const EDUCATION_AGE_LIMIT = 22;
export const EDUCATION_PER_CHILD = 2500000;

/**
 * Who relies on the user's income; mirrors the backend's householdOf(). Profiles saved before the dependents
 * list existed keep the old guess: a married user's first dependent is the spouse, the rest are children.
 */
export function householdOf(user: Pick<UserProfile, 'maritalStatus' | 'spouseIncome' | 'dependents' | 'dependentDetails'>) {
  const married = user.maritalStatus === 'Married';
  if (user.dependentDetails.length === 0) {
    const children = married ? Math.max(0, user.dependents - 1) : user.dependents;
    return { children: Array<number | null>(children).fill(null), parents: [] as number[], siblings: [] as number[], count: user.dependents };
  }
  const ages = (relation: DependentRelation) => user.dependentDetails.filter(d => d.relation === relation).map(d => d.age);
  const spouseDependent = married && user.spouseIncome === 0;
  return {
    children: ages('child') as (number | null)[],
    parents: ages('parent'),
    siblings: ages('sibling'),
    count: user.dependentDetails.length + (spouseDependent ? 1 : 0),
  };
}

/** Children and siblings still needing education funded (unknown ages count). */
export function inEducation(h: ReturnType<typeof householdOf>): number {
  return [...h.children, ...h.siblings].filter(age => age === null || age < EDUCATION_AGE_LIMIT).length;
}
