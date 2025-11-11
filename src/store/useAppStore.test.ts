import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    localStorage.clear();

    // Reset store to initial state
    useAppStore.setState({
      ownedCharacterIds: [],
      characterLevels: {},
      selectedMissionIds: [],
    });
  });

  describe('Character ownership', () => {
    it('should add character when toggling unowned character', () => {
      const { toggleCharacterOwnership } = useAppStore.getState();

      toggleCharacterOwnership('char-001');

      const { ownedCharacterIds, characterLevels } = useAppStore.getState();
      expect(ownedCharacterIds).toContain('char-001');
      expect(characterLevels['char-001']).toBe(1);
    });

    it('should remove character when toggling owned character', () => {
      const { toggleCharacterOwnership } = useAppStore.getState();

      toggleCharacterOwnership('char-001');
      toggleCharacterOwnership('char-001');

      const { ownedCharacterIds, characterLevels } = useAppStore.getState();
      expect(ownedCharacterIds).not.toContain('char-001');
      expect(characterLevels['char-001']).toBeUndefined();
    });
  });

  describe('Character levels', () => {
    it('should set character level', () => {
      const { setCharacterLevel } = useAppStore.getState();

      setCharacterLevel('char-001', 50);

      expect(useAppStore.getState().characterLevels['char-001']).toBe(50);
    });

    it('should clamp level to 1-90 range', () => {
      const { setCharacterLevel } = useAppStore.getState();

      setCharacterLevel('char-001', 0);
      expect(useAppStore.getState().characterLevels['char-001']).toBe(1);

      setCharacterLevel('char-001', 150);
      expect(useAppStore.getState().characterLevels['char-001']).toBe(90);

      setCharacterLevel('char-001', -10);
      expect(useAppStore.getState().characterLevels['char-001']).toBe(1);
    });

    it('should bulk set character levels', () => {
      const { setCharacterLevels } = useAppStore.getState();

      setCharacterLevels({
        'char-001': 30,
        'char-002': 50,
        'char-003': 70,
      });

      const levels = useAppStore.getState().characterLevels;
      expect(levels['char-001']).toBe(30);
      expect(levels['char-002']).toBe(50);
      expect(levels['char-003']).toBe(70);
    });
  });

  describe('Mission selection', () => {
    it('should add mission when toggling unselected mission', () => {
      const { toggleMissionSelection } = useAppStore.getState();

      toggleMissionSelection('mission-001');

      expect(useAppStore.getState().selectedMissionIds).toContain('mission-001');
    });

    it('should remove mission when toggling selected mission', () => {
      const { toggleMissionSelection } = useAppStore.getState();

      toggleMissionSelection('mission-001');
      toggleMissionSelection('mission-001');

      expect(useAppStore.getState().selectedMissionIds).not.toContain('mission-001');
    });

    it('should enforce 4-mission limit', () => {
      const { toggleMissionSelection } = useAppStore.getState();

      toggleMissionSelection('mission-001');
      toggleMissionSelection('mission-002');
      toggleMissionSelection('mission-003');
      toggleMissionSelection('mission-004');

      expect(useAppStore.getState().selectedMissionIds).toHaveLength(4);

      // Try to add 5th mission - should be ignored
      toggleMissionSelection('mission-005');

      const selected = useAppStore.getState().selectedMissionIds;
      expect(selected).toHaveLength(4);
      expect(selected).not.toContain('mission-005');
    });
  });

  describe('Clear functions', () => {
    it('should clear owned characters and levels', () => {
      const { toggleCharacterOwnership, clearOwnedCharacters } = useAppStore.getState();

      toggleCharacterOwnership('char-001');
      toggleCharacterOwnership('char-002');

      clearOwnedCharacters();

      const { ownedCharacterIds, characterLevels } = useAppStore.getState();
      expect(ownedCharacterIds).toHaveLength(0);
      expect(Object.keys(characterLevels)).toHaveLength(0);
    });

    it('should clear levels only', () => {
      const { toggleCharacterOwnership, setCharacterLevel, clearLevels } = useAppStore.getState();

      toggleCharacterOwnership('char-001');
      setCharacterLevel('char-001', 50);

      clearLevels();

      const { ownedCharacterIds, characterLevels } = useAppStore.getState();
      expect(ownedCharacterIds).toContain('char-001');
      expect(Object.keys(characterLevels)).toHaveLength(0);
    });

    it('should clear selected missions', () => {
      const { toggleMissionSelection, clearSelectedMissions } = useAppStore.getState();

      toggleMissionSelection('mission-001');
      toggleMissionSelection('mission-002');

      clearSelectedMissions();

      expect(useAppStore.getState().selectedMissionIds).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist state to localStorage', () => {
      const { toggleCharacterOwnership, toggleMissionSelection } = useAppStore.getState();

      toggleCharacterOwnership('char-001');
      toggleMissionSelection('mission-001');

      const stored = localStorage.getItem('ss-app');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.ownedCharacterIds).toContain('char-001');
      expect(parsed.state.selectedMissionIds).toContain('mission-001');
    });
  });
});
