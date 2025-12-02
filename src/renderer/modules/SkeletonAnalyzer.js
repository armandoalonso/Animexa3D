import * as THREE from 'three';

/**
 * SkeletonAnalyzer - Skeleton detection and analysis utilities
 * Handles skeleton structure analysis, bone hierarchy, and root bone detection
 */
export class SkeletonAnalyzer {
  constructor() {}

  /**
   * Detect duplicate bone names in skeleton
   * @param {Array<string>} boneNames - Array of bone names
   * @returns {Array<string>} - Array of duplicate bone names
   */
  detectDuplicateBoneNames(boneNames) {
    if (!boneNames || boneNames.length === 0) return [];
    
    const nameCount = {};
    const duplicates = [];
    
    for (const name of boneNames) {
      nameCount[name] = (nameCount[name] || 0) + 1;
    }
    
    for (const [name, count] of Object.entries(nameCount)) {
      if (count > 1) {
        duplicates.push(`${name} (x${count})`);
      }
    }
    
    return duplicates;
  }

  /**
   * Build visual bone hierarchy tree for UI
   * @param {Object} skeletonInfo - Skeleton information
   * @param {boolean} isSource - Whether this is source or target skeleton
   * @param {Object} boneMapping - Current bone mapping (optional)
   * @returns {string} - HTML string for bone tree
   */
  buildBoneTree(skeletonInfo, isSource, boneMapping = {}) {
    if (!skeletonInfo || !skeletonInfo.bones || skeletonInfo.bones.length === 0) {
      return '<p class="has-text-grey">No bones found</p>';
    }
    
    const bones = skeletonInfo.bones;
    
    console.log('buildBoneTree:', {
      isSource,
      boneCount: bones.length,
      firstBone: bones[0]?.name,
      firstBoneHasParent: !!bones[0]?.parent,
      firstBoneParentType: bones[0]?.parent?.type
    });
    
    // Build tree structure
    const buildTreeNode = (bone, depth = 0) => {
      const isMapped = isSource ? 
        Object.keys(boneMapping).includes(bone.name) :
        Object.values(boneMapping).includes(bone.name);
      
      const indent = depth * 20;
      const mappedClass = isMapped ? 'bone-mapped' : '';
      const sideClass = isSource ? 'source' : 'target';
      
      let html = `
        <div class="bone-item ${mappedClass}" 
             data-bone="${bone.name}" 
             data-side="${sideClass}"
             style="padding-left: ${indent}px;">
          <span class="bone-name">${bone.name}</span>
        </div>
      `;
      
      // Add children
      if (bone.children && bone.children.length > 0) {
        for (const child of bone.children) {
          // Only render children that are bones
          if (child.isBone || child.type === 'Bone') {
            html += buildTreeNode(child, depth + 1);
          }
        }
      }
      
      return html;
    };
    
    // Find root bones (bones without parents or parent is not a bone)
    const boneSet = new Set(bones);
    const rootBones = bones.filter(bone => {
      if (!bone.parent) return true;
      // Check if parent is a bone and is in our bone list
      const parentIsBone = (bone.parent.isBone || bone.parent.type === 'Bone');
      const parentInSet = boneSet.has(bone.parent);
      return !parentIsBone || !parentInSet;
    });
    
    console.log('buildBoneTree found', rootBones.length, 'root bones:', rootBones.map(b => b.name));
    
    if (rootBones.length === 0) {
      // Fallback: if no root found, use first bone
      console.warn('No root bones found, using first bone as root');
      rootBones.push(bones[0]);
    }
    
    let html = '<div class="bone-tree">';
    for (const rootBone of rootBones) {
      html += buildTreeNode(rootBone);
    }
    html += '</div>';
    
    return html;
  }

  /**
   * Find root bones in a bone array
   * @param {Array<THREE.Bone>} bones - Array of bones
   * @returns {Array<THREE.Bone>} - Array of root bones
   */
  findRootBones(bones) {
    const boneSet = new Set(bones);
    const rootBones = bones.filter(bone => {
      if (!bone.parent) return true;
      const parentIsBone = (bone.parent.isBone || bone.parent.type === 'Bone');
      const parentInSet = boneSet.has(bone.parent);
      return !parentIsBone || !parentInSet;
    });
    return rootBones;
  }

  /**
   * Extract skeleton info from a model
   * @param {THREE.Object3D} model
   * @returns {Object} - { bones: Array, boneNames: Array }
   */
  extractSkeletonInfo(model) {
    if (!model) {
      return { bones: [], boneNames: [] };
    }
    
    const bones = [];
    const boneNames = [];
    
    model.traverse((child) => {
      if (child.isBone || child.type === 'Bone') {
        bones.push(child);
        boneNames.push(child.name);
      }
    });
    
    return { bones, boneNames };
  }

  /**
   * Create a THREE.Skeleton from an array of bones
   * @param {Array<THREE.Bone>} bones
   * @returns {THREE.Skeleton}
   */
  createSkeletonFromBones(bones) {
    if (!bones || bones.length === 0) return null;
    
    // Update world matrices for all bones
    if (bones[0].parent) {
      bones[0].parent.updateWorldMatrix(true, true);
    }
    bones[0].updateWorldMatrix(false, true);
    
    // Create skeleton with bone inverses
    const boneInverses = [];
    for (let i = 0; i < bones.length; i++) {
      const boneInverse = new THREE.Matrix4();
      boneInverse.copy(bones[i].matrixWorld).invert();
      boneInverses.push(boneInverse);
    }
    
    return new THREE.Skeleton(bones, boneInverses);
  }

  /**
   * Create a simple skeleton helper from skeleton info (for animation-only files)
   * @param {Object} skeletonInfo
   * @returns {THREE.Object3D}
   */
  createSkeletonHelper(skeletonInfo) {
    const helper = new THREE.Object3D();
    helper.name = 'SkeletonHelper';
    
    // Add bones to the helper
    if (skeletonInfo.bones && skeletonInfo.bones.length > 0) {
      skeletonInfo.bones.forEach(bone => {
        helper.add(bone);
      });
    }
    
    return helper;
  }

  /**
   * Find bone index by bone object
   * @param {THREE.Skeleton} skeleton
   * @param {THREE.Bone} bone
   * @returns {number} - Index or -1
   */
  findIndexOfBone(skeleton, bone) {
    if (!bone) return -1;
    const bones = skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      if (bones[i] === bone) return i;
    }
    return -1;
  }

  /**
   * Find bone index by name
   * @param {THREE.Skeleton} skeleton
   * @param {string} name
   * @returns {number} - Index or -1
   */
  findIndexOfBoneByName(skeleton, name) {
    if (!name) return -1;
    const bones = skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      if (bones[i].name === name) return i;
    }
    return -1;
  }

  /**
   * Get skeleton from a model (finds SkinnedMesh or creates skeleton from bones)
   * @param {THREE.Object3D} model - The model to extract skeleton from
   * @param {Object} skeletonInfo - Optional skeleton info to use if no SkinnedMesh found
   * @returns {THREE.Skeleton|null}
   */
  getSkeletonFromModel(model, skeletonInfo = null) {
    if (!model) return null;
    
    // First try to find a SkinnedMesh with skeleton
    let skeleton = null;
    if (model.traverse) {
      model.traverse((child) => {
        if (child.isSkinnedMesh && !skeleton) {
          skeleton = child.skeleton;
        }
      });
    }
    
    // If no skeleton found but we have skeleton info, create one
    if (!skeleton && skeletonInfo && skeletonInfo.bones.length > 0) {
      console.log('Creating skeleton from skeleton info');
      skeleton = this.createSkeletonFromBones(skeletonInfo.bones);
    }
    
    return skeleton;
  }

  /**
   * Detect the functional root bone (typically Hips/Pelvis)
   * @param {Array<THREE.Bone>} bones - Array of bones
   * @returns {string|null} - Root bone name or null
   */
  detectFunctionalRootBone(bones) {
    if (!bones || bones.length === 0) return null;
    
    // Try to find a functional root bone (Hips, Pelvis, etc.)
    const functionalRootPatterns = /^(.*hips?.*|.*pelvis.*|.*root.*)$/i;
    const functionalRoot = bones.find(bone => functionalRootPatterns.test(bone.name));
    
    if (functionalRoot) {
      return functionalRoot.name;
    }
    
    // Fallback to first root bone
    const rootBones = this.findRootBones(bones);
    return rootBones.length > 0 ? rootBones[0].name : bones[0].name;
  }

  /**
   * Analyze skeleton structure and return detailed information
   * @param {THREE.Skeleton} skeleton
   * @returns {Object} - Detailed skeleton analysis
   */
  analyzeSkeletonStructure(skeleton) {
    if (!skeleton || !skeleton.bones) {
      return {
        boneCount: 0,
        rootBones: [],
        maxDepth: 0,
        hasSymmetry: false,
        limbCount: 0
      };
    }

    const bones = skeleton.bones;
    const rootBones = this.findRootBones(bones);

    // Calculate max depth
    let maxDepth = 0;
    const calculateDepth = (bone, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      if (bone.children) {
        for (const child of bone.children) {
          if (child.isBone || child.type === 'Bone') {
            calculateDepth(child, depth + 1);
          }
        }
      }
    };

    for (const root of rootBones) {
      calculateDepth(root);
    }

    // Check for symmetry (left/right bones)
    const boneNames = bones.map(b => b.name.toLowerCase());
    const hasLeft = boneNames.some(name => name.includes('left') || name.includes('_l'));
    const hasRight = boneNames.some(name => name.includes('right') || name.includes('_r'));
    const hasSymmetry = hasLeft && hasRight;

    // Count limbs (arms and legs)
    const limbPatterns = ['arm', 'leg', 'thigh', 'shoulder'];
    const limbCount = boneNames.filter(name => 
      limbPatterns.some(pattern => name.includes(pattern))
    ).length;

    return {
      boneCount: bones.length,
      rootBones: rootBones.map(b => b.name),
      maxDepth,
      hasSymmetry,
      limbCount
    };
  }
}
