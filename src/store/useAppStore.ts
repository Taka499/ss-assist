import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { analytics } from '../lib/analytics';

interface AppStore {
  // State
  ownedCharacterIds: string[];
  characterLevels: Record<string, number>;
  selectedCommissionIds: string[];

  // Actions
  toggleCharacterOwnership: (characterId: string) => void;
  setCharacterLevel: (characterId: string, level: number) => void;
  setCharacterLevels: (levels: Record<string, number>) => void;
  toggleCommissionSelection: (commissionId: string) => void;
  clearOwnedCharacters: () => void;
  clearLevels: () => void;
  clearSelectedCommissions: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      ownedCharacterIds: [],
      characterLevels: {},
      selectedCommissionIds: [],

      // Toggle character ownership (add if not owned, remove if owned)
      toggleCharacterOwnership: (characterId: string) =>
        set((state) => {
          const isOwned = state.ownedCharacterIds.includes(characterId);
          if (isOwned) {
            // Remove character and their level
            const newLevels = { ...state.characterLevels };
            delete newLevels[characterId];
            return {
              ownedCharacterIds: state.ownedCharacterIds.filter(id => id !== characterId),
              characterLevels: newLevels,
            };
          } else {
            // Add character with default level 1
            return {
              ownedCharacterIds: [...state.ownedCharacterIds, characterId],
              characterLevels: { ...state.characterLevels, [characterId]: 1 },
            };
          }
        }),

      // Set character level (1-90)
      setCharacterLevel: (characterId: string, level: number) =>
        set((state) => ({
          characterLevels: {
            ...state.characterLevels,
            [characterId]: Math.max(1, Math.min(90, level)), // Clamp to 1-90
          },
        })),

      // Bulk set character levels
      setCharacterLevels: (levels: Record<string, number>) =>
        set(() => ({
          characterLevels: levels,
        })),

      // Toggle commission selection (max 4)
      toggleCommissionSelection: (commissionId: string) =>
        set((state) => {
          const isSelected = state.selectedCommissionIds.includes(commissionId);
          if (isSelected) {
            // Remove commission
            analytics.trackCommissionDeselected(commissionId);
            return {
              selectedCommissionIds: state.selectedCommissionIds.filter(id => id !== commissionId),
            };
          } else {
            // Add commission if under limit
            if (state.selectedCommissionIds.length >= 4) {
              // Ignore - already at max
              return state;
            }
            analytics.trackCommissionSelected(commissionId);
            return {
              selectedCommissionIds: [...state.selectedCommissionIds, commissionId],
            };
          }
        }),

      // Clear functions
      clearOwnedCharacters: () =>
        set({ ownedCharacterIds: [], characterLevels: {} }),

      clearLevels: () =>
        set({ characterLevels: {} }),

      clearSelectedCommissions: () =>
        set({ selectedCommissionIds: [] }),
    }),
    {
      name: 'ss-app',
      version: 1, // Incremented for migration
      // Persist all state properties
      partialize: (state) => ({
        ownedCharacterIds: state.ownedCharacterIds,
        characterLevels: state.characterLevels,
        selectedCommissionIds: state.selectedCommissionIds,
      }),
      // Migrate from version 0 (mission terminology) to version 1 (commission terminology)
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate selectedMissionIds to selectedCommissionIds
          if (persistedState.selectedMissionIds) {
            persistedState.selectedCommissionIds = persistedState.selectedMissionIds;
            delete persistedState.selectedMissionIds;
          }
        }
        return persistedState;
      },
    }
  )
);
