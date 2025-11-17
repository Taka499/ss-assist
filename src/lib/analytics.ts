/**
 * Umami Analytics Helper
 *
 * Provides type-safe event tracking for user interactions.
 * Events are sent to Umami Cloud for privacy-friendly analytics.
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, string | number | boolean>) => void;
    };
  }
}

/**
 * Track a custom event in Umami
 * @param eventName - Name of the event (e.g., 'mission-analysis', 'language-change')
 * @param eventData - Optional additional data about the event
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && window.umami) {
    try {
      window.umami.track(eventName, eventData);
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.debug('Analytics tracking failed:', error);
    }
  }
}

/**
 * Predefined event tracking functions for common user actions
 */
export const analytics = {
  /**
   * Track when user changes language
   */
  trackLanguageChange: (language: string) => {
    trackEvent('language-change', { language });
  },

  /**
   * Track when user selects a specific mission
   */
  trackMissionSelected: (missionId: string) => {
    trackEvent('mission-selected', { missionId });
  },

  /**
   * Track when user deselects a specific mission
   */
  trackMissionDeselected: (missionId: string) => {
    trackEvent('mission-deselected', { missionId });
  },

  /**
   * Track roster composition when analysis is run
   */
  trackRosterComposition: (characterIds: string[]) => {
    // Track each character in the roster
    characterIds.forEach((characterId) => {
      trackEvent('roster-character', { characterId });
    });
  },
};
