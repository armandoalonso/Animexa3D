import * as THREE from 'three';

/**
 * Create a mock skeleton with specified bone names
 * @param {Array<string>} boneNames - Array of bone names
 * @returns {THREE.Skeleton}
 */
export function createMockSkeleton(boneNames) {
  const bones = boneNames.map((name, index) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(0, index * 0.1, 0); // Stack bones vertically
    return bone;
  });

  // Build hierarchy (each bone is child of previous)
  for (let i = 1; i < bones.length; i++) {
    bones[i - 1].add(bones[i]);
  }

  // Update matrices
  bones[0].updateWorldMatrix(false, true);

  // Create skeleton
  const boneInverses = bones.map(bone => {
    const inverse = new THREE.Matrix4();
    inverse.copy(bone.matrixWorld).invert();
    return inverse;
  });

  return new THREE.Skeleton(bones, boneInverses);
}

/**
 * Create a mock animation clip
 * @param {string} name - Clip name
 * @param {number} duration - Duration in seconds
 * @param {Array<string>} boneNames - Bones to animate
 * @returns {THREE.AnimationClip}
 */
export function createMockAnimationClip(name, duration, boneNames) {
  const tracks = [];

  boneNames.forEach((boneName, index) => {
    // Create quaternion track
    const times = [0, duration / 2, duration];
    const values = [
      0, 0, 0, 1, // Start
      Math.sin(index), 0, 0, Math.cos(index), // Middle
      0, 0, 0, 1  // End
    ];

    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        `${boneName}.quaternion`,
        times,
        values
      )
    );
  });

  return new THREE.AnimationClip(name, duration, tracks);
}

/**
 * Create a mock model with skeleton
 * @param {Array<string>} boneNames - Bone names
 * @returns {THREE.Object3D}
 */
export function createMockModel(boneNames) {
  const model = new THREE.Object3D();
  model.name = 'MockModel';

  // Create a skinned mesh
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.SkinnedMesh(geometry, material);

  // Add skeleton
  const skeleton = createMockSkeleton(boneNames);
  mesh.bind(skeleton);

  // Add root bone to model
  model.add(skeleton.bones[0]);
  model.add(mesh);

  return model;
}

/**
 * Create humanoid skeleton bone names
 * @param {string} type - 'mixamo', 'ue5', or 'unity'
 * @returns {Array<string>}
 */
export function getHumanoidBoneNames(type = 'mixamo') {
  const mixamoBones = [
    'mixamorig:Hips',
    'mixamorig:Spine',
    'mixamorig:Spine1',
    'mixamorig:Spine2',
    'mixamorig:Neck',
    'mixamorig:Head',
    'mixamorig:LeftShoulder',
    'mixamorig:LeftArm',
    'mixamorig:LeftForeArm',
    'mixamorig:LeftHand',
    'mixamorig:RightShoulder',
    'mixamorig:RightArm',
    'mixamorig:RightForeArm',
    'mixamorig:RightHand',
    'mixamorig:LeftUpLeg',
    'mixamorig:LeftLeg',
    'mixamorig:LeftFoot',
    'mixamorig:RightUpLeg',
    'mixamorig:RightLeg',
    'mixamorig:RightFoot'
  ];

  const ue5Bones = [
    'pelvis',
    'spine_01',
    'spine_02',
    'spine_03',
    'neck_01',
    'head',
    'clavicle_l',
    'upperarm_l',
    'lowerarm_l',
    'hand_l',
    'clavicle_r',
    'upperarm_r',
    'lowerarm_r',
    'hand_r',
    'thigh_l',
    'calf_l',
    'foot_l',
    'thigh_r',
    'calf_r',
    'foot_r'
  ];

  const unityBones = [
    'Hips',
    'Spine',
    'Chest',
    'Neck',
    'Head',
    'LeftShoulder',
    'LeftUpperArm',
    'LeftLowerArm',
    'LeftHand',
    'RightShoulder',
    'RightUpperArm',
    'RightLowerArm',
    'RightHand',
    'LeftUpperLeg',
    'LeftLowerLeg',
    'LeftFoot',
    'RightUpperLeg',
    'RightLowerLeg',
    'RightFoot'
  ];

  switch (type) {
    case 'mixamo':
      return mixamoBones;
    case 'ue5':
      return ue5Bones;
    case 'unity':
      return unityBones;
    default:
      return mixamoBones;
  }
}

/**
 * Assert that two vectors are approximately equal
 * @param {THREE.Vector3} v1
 * @param {THREE.Vector3} v2
 * @param {number} epsilon
 */
export function assertVectorEquals(v1, v2, epsilon = 0.001) {
  const dx = Math.abs(v1.x - v2.x);
  const dy = Math.abs(v1.y - v2.y);
  const dz = Math.abs(v1.z - v2.z);
  
  if (dx > epsilon || dy > epsilon || dz > epsilon) {
    throw new Error(
      `Vectors not equal:\n` +
      `  Expected: (${v2.x}, ${v2.y}, ${v2.z})\n` +
      `  Got:      (${v1.x}, ${v1.y}, ${v1.z})\n` +
      `  Delta:    (${dx}, ${dy}, ${dz})`
    );
  }
}

/**
 * Assert that two quaternions are approximately equal
 * @param {THREE.Quaternion} q1
 * @param {THREE.Quaternion} q2
 * @param {number} epsilon
 */
export function assertQuaternionEquals(q1, q2, epsilon = 0.001) {
  // Quaternions q and -q represent the same rotation
  const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
  const absDot = Math.abs(dot);
  
  if (absDot < 1 - epsilon) {
    throw new Error(
      `Quaternions not equal:\n` +
      `  Expected: (${q2.x}, ${q2.y}, ${q2.z}, ${q2.w})\n` +
      `  Got:      (${q1.x}, ${q1.y}, ${q1.z}, ${q1.w})\n` +
      `  Dot:      ${dot}`
    );
  }
}
