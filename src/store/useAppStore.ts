import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { analytics } from '../lib/analytics';

interface AppStore {
  // State
  ownedCharacterIds: string[];
  characterLevels: Record<string, number>;
  selectedMissionIds: string[];

  // Actions
  toggleCharacterOwnership: (characterId: string) => void;
  setCharacterLevel: (characterId: string, level: number) => void;
  setCharacterLevels: (levels: Record<string, number>) => void;
  toggleMissionSelection: (missionId: string) => void;
  clearOwnedCharacters: () => void;
  clearLevels: () => void;
  clearSelectedMissions: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      ownedCharacterIds: [],
      characterLevels: {},
      selectedMissionIds: [],

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

      // Toggle mission selection (max 4)
      toggleMissionSelection: (missionId: string) =>
        set((state) => {
          const isSelected = state.selectedMissionIds.includes(missionId);
          if (isSelected) {
            // Remove mission
            analytics.trackMissionDeselected(missionId);
            return {
              selectedMissionIds: state.selectedMissionIds.filter(id => id !== missionId),
            };
          } else {
            // Add mission if under limit
            if (state.selectedMissionIds.length >= 4) {
              // Ignore - already at max
              return state;
            }
            analytics.trackMissionSelected(missionId);
            return {
              selectedMissionIds: [...state.selectedMissionIds, missionId],
            };
          }
        }),

      // Clear functions
      clearOwnedCharacters: () =>
        set({ ownedCharacterIds: [], characterLevels: {} }),

      clearLevels: () =>
        set({ characterLevels: {} }),

      clearSelectedMissions: () =>
        set({ selectedMissionIds: [] }),
    }),
    {
      name: 'ss-app',
      // Persist all state properties
      partialize: (state) => ({
        ownedCharacterIds: state.ownedCharacterIds,
        characterLevels: state.characterLevels,
        selectedMissionIds: state.selectedMissionIds,
      }),
    }
  )
);
