import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelLoader } from '@renderer/modules/io/ModelLoader.js';
import * as THREE from 'three';

describe('ModelLoader', () => {
  let sceneManager;
  let modelLoader;

  beforeEach(() => {
    sceneManager = {
      addModel: vi.fn(),
      createMixer: vi.fn(),
      clearModel: vi.fn()
    };

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="loading-overlay" style="display: none;"></div>
      <div id="empty-state"></div>
      <div id="model-info" style="display: none;">
        <span id="info-name"></span>
        <span id="info-polygons"></span>
        <span id="info-animations"></span>
        <span id="info-bones"></span>
      </div>
    `;

    modelLoader = new ModelLoader(sceneManager);
  });

  describe('extractSkeletons', () => {
    it('should extract skeletons from skinned mesh via parsing service', () => {
      const model = new THREE.Object3D();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.SkinnedMesh(geometry, material);
      
      const bones = [
        new THREE.Bone(),
        new THREE.Bone(),
        new THREE.Bone()
      ];
      bones[0].name = 'Root';
      bones[1].name = 'Spine';
      bones[2].name = 'Head';
      
      bones[0].add(bones[1]);
      bones[1].add(bones[2]);
      
      const skeleton = new THREE.Skeleton(bones);
      mesh.bind(skeleton);
      model.add(mesh);

      const result = modelLoader.parsingService.extractSkeletons(model);

      expect(result.bones.length).toBe(3);
      expect(result.boneNames).toContain('Root');
      expect(result.boneNames).toContain('Spine');
      expect(result.boneNames).toContain('Head');
    });

    it('should handle model without skeleton', () => {
      const model = new THREE.Object3D();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      model.add(mesh);

      const result = modelLoader.parsingService.extractSkeletons(model);

      expect(result.bones.length).toBe(0);
      expect(result.boneNames.length).toBe(0);
    });

    it('should not duplicate bones from multiple meshes', () => {
      const model = new THREE.Object3D();
      
      const bones = [new THREE.Bone(), new THREE.Bone()];
      bones[0].name = 'Bone1';
      bones[1].name = 'Bone2';
      bones[0].add(bones[1]);
      
      const skeleton = new THREE.Skeleton(bones);
      
      // Two meshes sharing same skeleton
      const mesh1 = new THREE.SkinnedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      const mesh2 = new THREE.SkinnedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      
      mesh1.bind(skeleton);
      mesh2.bind(skeleton);
      
      model.add(mesh1);
      model.add(mesh2);

      const result = modelLoader.parsingService.extractSkeletons(model);

      // Should not duplicate bones
      expect(result.bones.length).toBe(2);
    });
  });

  describe('extractAllBones', () => {
    it('should extract bones from hierarchy via parsing service', () => {
      const model = new THREE.Object3D();
      const bone1 = new THREE.Bone();
      const bone2 = new THREE.Bone();
      const bone3 = new THREE.Bone();
      
      bone1.name = 'Bone1';
      bone2.name = 'Bone2';
      bone3.name = 'Bone3';
      
      bone1.add(bone2);
      bone2.add(bone3);
      model.add(bone1);

      const result = modelLoader.parsingService.extractAllBones(model);

      expect(result.bones.length).toBe(3);
      expect(result.boneNames).toEqual(['Bone1', 'Bone2', 'Bone3']);
    });

    it('should handle model without bones', () => {
      const model = new THREE.Object3D();
      model.add(new THREE.Mesh());

      const result = modelLoader.parsingService.extractAllBones(model);

      expect(result.bones.length).toBe(0);
    });
  });

  describe('countPolygons', () => {
    it('should count polygons with indexed geometry via analysis service', () => {
      const model = new THREE.Object3D();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      model.add(mesh);

      const count = modelLoader.analysisService.countPolygons(model);

      expect(count).toBeGreaterThan(0);
      expect(count).toBe(12); // Box has 12 triangles
    });

    it('should count polygons with non-indexed geometry', () => {
      const model = new THREE.Object3D();
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      model.add(mesh);

      const count = modelLoader.analysisService.countPolygons(model);

      expect(count).toBe(1); // One triangle
    });

    it('should return 0 for model without geometry', () => {
      const model = new THREE.Object3D();

      const count = modelLoader.analysisService.countPolygons(model);

      expect(count).toBe(0);
    });
  });

  describe('countBones', () => {
    it('should count bones in skeleton via analysis service', () => {
      const model = new THREE.Object3D();
      const mesh = new THREE.SkinnedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      
      const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
      const skeleton = new THREE.Skeleton(bones);
      mesh.bind(skeleton);
      model.add(mesh);

      const count = modelLoader.analysisService.countBones(model);

      expect(count).toBe(3);
    });

    it('should return 0 for model without bones', () => {
      const model = new THREE.Object3D();

      const count = modelLoader.analysisService.countBones(model);

      expect(count).toBe(0);
    });
  });

  describe('verifyBoneStructureCompatibility', () => {
    it('should return compatible for identical bone structures', () => {
      const bones = ['Hips', 'Spine', 'Head'];
      const sourceSkeletons = { boneNames: bones };
      const targetSkeletons = { boneNames: bones };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.compatible).toBe(true);
      expect(result.matchPercentage).toBe(100);
      expect(result.missingBones.length).toBe(0);
    });

    it('should detect missing bones', () => {
      const sourceSkeletons = { boneNames: ['Hips', 'Spine', 'Head', 'Neck'] };
      const targetSkeletons = { boneNames: ['Hips', 'Spine'] };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.missingBones).toContain('Head');
      expect(result.missingBones).toContain('Neck');
      expect(result.matchPercentage).toBe(50); // 2/4 bones match
    });

    it('should detect extra bones', () => {
      const sourceSkeletons = { boneNames: ['Hips', 'Spine'] };
      const targetSkeletons = { boneNames: ['Hips', 'Spine', 'Head', 'Neck'] };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.extraBones).toContain('Head');
      expect(result.extraBones).toContain('Neck');
      expect(result.matchPercentage).toBe(100); // All source bones found
    });

    it('should be compatible with 80% match', () => {
      const sourceSkeletons = { boneNames: ['B1', 'B2', 'B3', 'B4', 'B5'] };
      const targetSkeletons = { boneNames: ['B1', 'B2', 'B3', 'B4', 'B6'] };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.matchPercentage).toBe(80);
      expect(result.compatible).toBe(true);
    });

    it('should be incompatible with <80% match', () => {
      const sourceSkeletons = { boneNames: ['B1', 'B2', 'B3', 'B4', 'B5'] };
      const targetSkeletons = { boneNames: ['B1', 'B2', 'B6', 'B7', 'B8'] };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.matchPercentage).toBe(40); // 2/5
      expect(result.compatible).toBe(false);
    });

    it('should handle null skeletons', () => {
      const result = modelLoader.verifyBoneStructureCompatibility(null, null);

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBe(0);
    });

    it('should handle empty bone arrays', () => {
      const sourceSkeletons = { boneNames: [] };
      const targetSkeletons = { boneNames: ['Bone1'] };

      const result = modelLoader.verifyBoneStructureCompatibility(
        sourceSkeletons,
        targetSkeletons
      );

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBe(0);
    });
  });

  describe('updateModelInfo', () => {
    it('should update DOM with model info via UI adapter', () => {
      modelLoader.uiAdapter.updateModelInfo('test.glb', 1500, 5, 25);

      expect(document.getElementById('info-name').textContent).toBe('test.glb');
      expect(document.getElementById('info-polygons').textContent).toBe('1,500');
      expect(document.getElementById('info-animations').textContent).toBe('5');
      expect(document.getElementById('info-bones').textContent).toBe('25');
      expect(document.getElementById('model-info').style.display).toBe('block');
    });

    it('should show N/A for zero bones', () => {
      modelLoader.uiAdapter.updateModelInfo('test.glb', 1000, 0, 0);

      expect(document.getElementById('info-bones').textContent).toBe('N/A');
    });
  });

  describe('getCurrentModelData', () => {
    it('should return current model data', () => {
      const mockData = {
        model: new THREE.Object3D(),
        animations: [],
        filename: 'test.glb'
      };
      modelLoader.currentModelData = mockData;

      const result = modelLoader.getCurrentModelData();

      expect(result).toBe(mockData);
    });

    it('should return null when no model loaded', () => {
      const result = modelLoader.getCurrentModelData();

      expect(result).toBeNull();
    });
  });

  describe('clearCurrentModel', () => {
    it('should clear current model data', () => {
      modelLoader.currentModelData = { model: new THREE.Object3D() };

      modelLoader.clearCurrentModel();

      expect(modelLoader.currentModelData).toBeNull();
    });

    it('should hide model info panel', () => {
      document.getElementById('model-info').style.display = 'block';

      modelLoader.clearCurrentModel();

      expect(document.getElementById('model-info').style.display).toBe('none');
    });
  });
});
