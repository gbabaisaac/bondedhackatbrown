import {
    FEATURE_GATES,
    getDisabledFeatures,
    getEnabledFeatures,
    isFeatureEnabled
} from '../featureGates';

describe('Feature Gates Utils', () => {

    it('isFeatureEnabled should return correct values', () => {
        // We test against the actual constant values in the file
        // If FEATURE_GATES.LINK_AI is false, isFeatureEnabled('LINK_AI') should be false
        const expected = FEATURE_GATES.LINK_AI;
        expect(isFeatureEnabled('LINK_AI')).toBe(expected);
    });

    it('isFeatureEnabled should return false for unknown feature', () => {
        expect(isFeatureEnabled('UNKNOWN_FEATURE')).toBe(false);
    });

    it('getEnabledFeatures should return only enabled features', () => {
        const enabled = getEnabledFeatures();
        enabled.forEach(feature => {
            expect(FEATURE_GATES[feature]).toBe(true);
        });
    });

    it('getDisabledFeatures should return only disabled features', () => {
        const disabled = getDisabledFeatures();
        disabled.forEach(feature => {
            expect(FEATURE_GATES[feature]).toBe(false);
        });
    });
});
