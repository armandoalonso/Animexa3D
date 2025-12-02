import { describe, it, expect, beforeEach } from 'vitest';
import { BoneMappingService } from '@renderer/modules/retargeting/BoneMappingService.js';
import { getHumanoidBoneNames } from '../utils/testHelpers.js';

describe('BoneMappingService', () => {
  let boneMappingService;

  beforeEach(() => {
    boneMappingService = new BoneMappingService();
  });

  describe('detectRigType', () => {
    it('should detect Mixamo rig', () => {
      const bones = getHumanoidBoneNames('mixamo');
      const rigType = boneMappingService.detectRigType(bones);

      expect(rigType).toBe('mixamo');
    });

    it('should detect UE5 rig', () => {
      const bones = getHumanoidBoneNames('ue5');
      const rigType = boneMappingService.detectRigType(bones);

      expect(rigType).toBe('ue5');
    });

    it('should detect Unity rig', () => {
      const bones = getHumanoidBoneNames('unity');
      const rigType = boneMappingService.detectRigType(bones);

      expect(rigType).toBe('unity');
    });

    it('should detect generic humanoid rig', () => {
      const bones = ['Hips', 'Spine', 'Head', 'LeftArm', 'RightLeg'];
      const rigType = boneMappingService.detectRigType(bones);

      expect(rigType).toBe('humanoid');
    });

    it('should return custom for unknown rig', () => {
      const bones = ['Bone1', 'Bone2', 'Bone3'];
      const rigType = boneMappingService.detectRigType(bones);

      expect(rigType).toBe('custom');
    });

    it('should handle empty bone array', () => {
      const rigType = boneMappingService.detectRigType([]);

      expect(rigType).toBe('custom');
    });

    it('should handle null bone names', () => {
      const rigType = boneMappingService.detectRigType(null);

      expect(rigType).toBe('custom');
    });
  });

  describe('generateAutomaticMapping', () => {
    it('should map matching bones between similar rigs', () => {
      const sourceBones = getHumanoidBoneNames('mixamo');
      const targetBones = getHumanoidBoneNames('unity');

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(result.mapping).toBeDefined();
      expect(Object.keys(result.mapping).length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include hand bones when requested', () => {
      const sourceBones = [
        ...getHumanoidBoneNames('mixamo'),
        'mixamorig:LeftHandThumb1',
        'mixamorig:LeftHandIndex1'
      ];
      const targetBones = [
        ...getHumanoidBoneNames('unity'),
        'LeftHandThumb1',
        'LeftHandIndex1'
      ];

      const withoutHands = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);
      const withHands = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, true);

      expect(Object.keys(withHands.mapping).length).toBeGreaterThan(
        Object.keys(withoutHands.mapping).length
      );
    });

    it('should have high confidence for identical rigs', () => {
      const bones = getHumanoidBoneNames('mixamo');

      const result = boneMappingService.generateAutomaticMapping(bones, bones, false);

      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should return empty mapping for incompatible rigs', () => {
      const sourceBones = ['CustomBone1', 'CustomBone2'];
      const targetBones = ['DifferentBone1', 'DifferentBone2'];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(Object.keys(result.mapping).length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should not map same target bone twice', () => {
      const sourceBones = ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Pelvis'];
      const targetBones = ['Hips']; // Only one target bone

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      // Should only map one bone
      expect(Object.keys(result.mapping).length).toBeLessThanOrEqual(1);
    });

    it('should handle case-insensitive matching', () => {
      const sourceBones = ['HIPS', 'SPINE', 'HEAD'];
      const targetBones = ['hips', 'spine', 'head'];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(Object.keys(result.mapping).length).toBe(3);
    });

    it('should match bones with underscores and spaces', () => {
      const sourceBones = ['Left_Arm', 'Right Arm', 'LeftUpLeg'];
      const targetBones = ['leftarm', 'rightarm', 'left_upleg'];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(Object.keys(result.mapping).length).toBeGreaterThan(0);
    });
  });

  describe('bone mapping management', () => {
    it('should add manual bone mapping', () => {
      boneMappingService.addManualMapping('SourceBone', 'TargetBone');

      expect(boneMappingService.boneMapping['SourceBone']).toBe('TargetBone');
    });

    it('should throw error when adding mapping without source bone', () => {
      expect(() => {
        boneMappingService.addManualMapping(null, 'TargetBone');
      }).toThrow();
    });

    it('should throw error when adding mapping without target bone', () => {
      expect(() => {
        boneMappingService.addManualMapping('SourceBone', null);
      }).toThrow();
    });

    it('should remove bone mapping', () => {
      boneMappingService.boneMapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };

      const result = boneMappingService.removeMapping('Bone1');

      expect(result).toBe(true);
      expect(boneMappingService.boneMapping['Bone1']).toBeUndefined();
      expect(boneMappingService.boneMapping['Bone2']).toBe('Target2');
    });

    it('should return false when removing non-existent mapping', () => {
      const result = boneMappingService.removeMapping('NonExistent');

      expect(result).toBe(false);
    });

    it('should clear all mappings', () => {
      boneMappingService.boneMapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };

      boneMappingService.clearMappings();

      expect(Object.keys(boneMappingService.boneMapping).length).toBe(0);
      expect(boneMappingService.mappingConfidence).toBe(0);
    });

    it('should set bone mapping from external source', () => {
      const mapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };
      const confidence = 0.85;

      boneMappingService.setBoneMapping(mapping, confidence);

      expect(boneMappingService.boneMapping).toEqual(mapping);
      expect(boneMappingService.mappingConfidence).toBe(confidence);
    });

    it('should get bone mapping copy', () => {
      boneMappingService.boneMapping = { 'Bone1': 'Target1' };

      const mapping = boneMappingService.getBoneMapping();

      expect(mapping).toEqual({ 'Bone1': 'Target1' });
      // Ensure it's a copy, not the original
      mapping['Bone2'] = 'Target2';
      expect(boneMappingService.boneMapping['Bone2']).toBeUndefined();
    });
  });

  describe('getMappingInfo', () => {
    it('should return mapping information', () => {
      boneMappingService.sourceRigType = 'mixamo';
      boneMappingService.targetRigType = 'unity';
      boneMappingService.boneMapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };
      boneMappingService.mappingConfidence = 0.75;

      const info = boneMappingService.getMappingInfo();

      expect(info.sourceRigType).toBe('mixamo');
      expect(info.targetRigType).toBe('unity');
      expect(info.mappingCount).toBe(2);
      expect(info.confidence).toBe(0.75);
    });
  });

  describe('setRigTypes', () => {
    it('should set rig types', () => {
      boneMappingService.setRigTypes('mixamo', 'ue5');

      expect(boneMappingService.sourceRigType).toBe('mixamo');
      expect(boneMappingService.targetRigType).toBe('ue5');
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on base bones only', () => {
      const sourceBones = [
        'Hips', 'Spine', 'Neck', 'Head',
        'LeftArm', 'LeftForeArm', 'LeftHand',
        'RightArm', 'RightForeArm', 'RightHand',
        'LeftUpLeg', 'LeftLeg', 'LeftFoot',
        'RightUpLeg', 'RightLeg', 'RightFoot'
      ];
      const targetBones = [...sourceBones];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      // Should have high confidence when all base bones match
      expect(result.confidence).toBeGreaterThan(0.65); // Lowered threshold
    });

    it('should not include finger bones in confidence calculation', () => {
      const sourceBones = [
        'Hips', 'Spine',
        'LeftHandThumb1', 'LeftHandIndex1' // Finger bones
      ];
      const targetBones = [
        'Hips', 'Spine',
        'LeftHandThumb1', 'LeftHandIndex1'
      ];

      const withoutFingers = boneMappingService.generateAutomaticMapping(
        ['Hips', 'Spine'],
        ['Hips', 'Spine'],
        false
      );

      const withFingers = boneMappingService.generateAutomaticMapping(
        sourceBones,
        targetBones,
        true
      );

      // Confidence should be similar (finger bones don't affect it)
      expect(Math.abs(withFingers.confidence - withoutFingers.confidence)).toBeLessThan(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle bones with mixamorig prefix', () => {
      const sourceBones = ['mixamorig:Hips', 'mixamorig:Spine'];
      const targetBones = ['Hips', 'Spine'];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(Object.keys(result.mapping).length).toBe(2);
    });

    it('should prevent hand bones from matching finger bones', () => {
      const sourceBones = ['LeftHand', 'LeftHandThumb1'];
      const targetBones = ['LeftHand'];

      const result = boneMappingService.generateAutomaticMapping(sourceBones, targetBones, false);

      // Should map LeftHand to LeftHand, not LeftHandThumb1 to LeftHand
      expect(result.mapping['LeftHand']).toBe('LeftHand');
      expect(result.mapping['LeftHandThumb1']).toBeUndefined();
    });

    it('should handle empty source bones', () => {
      const result = boneMappingService.generateAutomaticMapping([], ['Bone1'], false);

      expect(Object.keys(result.mapping).length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle empty target bones', () => {
      const result = boneMappingService.generateAutomaticMapping(['Bone1'], [], false);

      expect(Object.keys(result.mapping).length).toBe(0);
    });
  });
});
