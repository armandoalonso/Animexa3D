# Animation Retargeting Algorithm Documentation

## Overview

This document describes the robust animation retargeting algorithm implemented in `RetargetManager.js`. The implementation is based on industry-standard techniques used in MotionBuilder, Blender, Unreal Engine 5, and Unity, with specific inspiration from the [upf-gti/retargeting-threejs](https://github.com/upf-gti/retargeting-threejs) repository.

## Core Concepts

### What is Animation Retargeting?

Animation retargeting is the process of transferring animations from one skeleton (source) to another skeleton (target) that may have:
- Different bone names
- Different bone lengths and proportions
- Different hierarchies
- Different rest poses

### Why Simple Copy Doesn't Work

Simply copying animation curves fails because:
1. **Different bone lengths** → Different stride lengths and reach distances
2. **Different joint orientations** → Rotations are in different local spaces
3. **Different rest poses** → Axes drift and create twist problems

### The Solution: Shared Reference Pose

The algorithm works by:
1. Creating a shared "bind pose" (reference pose) for both skeletons
2. Computing rotations relative to this shared pose
3. Applying scale compensation for different proportions
4. Using quaternion math to avoid gimbal lock

## Algorithm Details

### Step 1: Bone Mapping

Create a semantic bone map between source and target skeletons:

```javascript
{
  'Hips': 'mixamorig:Hips',
  'LeftArm': 'LeftUpperArm',
  'RightFoot': 'R_Foot'
}
```

This mapping is function-based, not name-based. The same semantic bone (e.g., "left arm") is identified in both skeletons regardless of naming conventions.

### Step 2: Bind Pose Computation

For each skeleton, we compute:

1. **Parent indices** - Track bone hierarchy
2. **World transforms** - Position, rotation, scale in world space
3. **Inverse world transforms** - For efficient computation
4. **Embedded transforms** (optional) - Include parent object transforms

```javascript
srcBindPose = {
  bones: [...],
  parentIndices: Int16Array,
  transformsWorld: [{ p, q, s }, ...],
  transformsWorldInverses: [{ p, q, s }, ...],
  transformsWorldEmbedded: { forward, inverse }
}
```

### Step 3: Precompute Retargeting Quaternions

The core retargeting formula for rotations:

```
trgLocal = invBindTrgWorldParent * bindSrcWorldParent * srcLocal * invBindSrcWorld * bindTrgWorld
```

Breaking this down:

1. **srcLocal** - Source bone's local rotation from animation
2. **bindSrcWorldParent * srcLocal** - Convert to world space with bind pose parent
3. *** invBindSrcWorld** - Remove source bind pose → get offset rotation
4. *** bindTrgWorld** - Apply target bind pose → transfer motion
5. **invBindTrgWorldParent *** - Convert back to local space for target

This is split into "left" and "right" parts and precomputed for efficiency:

```javascript
left[i] = invBindTrgWorldParent * bindSrcWorldParent
right[i] = invBindSrcWorld * bindTrgWorld
```

Then at runtime:
```javascript
trgLocal = left * srcLocal * right
```

### Step 4: Position Retargeting (Root Motion)

Position is handled differently due to scale differences:

1. Get source position offset from bind pose
2. Scale by proportion ratio: `ratio = avgLength(target) / avgLength(source)`
3. Apply to target bind position

```javascript
diffPosition = (srcPos - srcBindPos) * proportionRatio
trgPos = trgBindPos + diffPosition
```

### Step 5: Apply to Animation Tracks

For each animation track:

**Quaternion Tracks** (rotations):
```javascript
for each keyframe:
  srcQuat = read from track
  trgQuat = left * srcQuat * right
  write to new track
```

**Position Tracks** (root motion):
```javascript
for each keyframe:
  srcPos = read from track
  offset = srcPos - srcBindPos
  trgPos = trgBindPos + (offset * proportionRatio)
  write to new track
```

## Key Implementation Details

### 1. Quaternion Math

All rotations use quaternions to avoid:
- Gimbal lock
- Euler angle ambiguity
- Interpolation artifacts

### 2. World Space Operations

The algorithm works in world space with shared bind poses, then converts back to local space. This ensures:
- Same visual result regardless of local bone coordinate systems
- Proper handling of different hierarchies

### 3. Scale Compensation

The proportion ratio compensates for different character sizes:

```javascript
proportionRatio = Σ(targetBoneLength) / Σ(sourceBoneLength)
```

This ensures a walk cycle covers the same relative distance.

### 4. Embedded World Transforms

When skeletons are inside container objects with transforms, we can "embed" those transforms into the root bone calculation. This allows:
- Easier pose alignment by rotating containers
- Cleaner skeleton data

## Usage Example

```javascript
// 1. Set source and target models
retargetManager.setSourceModel(sourceModelData);
retargetManager.setTargetModel(targetModelData);

// 2. Auto-map bones
retargetManager.autoMapBones();

// 3. (Optional) Add manual mappings
retargetManager.addManualMapping('LeftFinger1', 'L_Index1');

// 4. Retarget animation
const sourceClip = sourceAnimations[0];
const retargetedClip = retargetManager.retargetAnimation(sourceClip);

// 5. Apply to target model
animationManager.addAnimations([retargetedClip]);
```

## Advanced Features

### T-Pose Normalization

If bind poses are very different, you can normalize to T-pose:

```javascript
retargetManager.applyTPose(skeleton, boneMap);
```

This:
- Extends limb chains
- Aligns arms horizontally (±X axis)
- Aligns legs vertically (-Y axis)

### Custom Bind Poses

Control which pose to use as bind pose:

```javascript
// Use actual bind pose (default)
useCurrentPose: false

// Use current skeleton pose
useCurrentPose: true
```

### Embedded Transforms

Include parent object transforms:

```javascript
embedWorld: true  // Include container transforms
```

## Common Issues and Solutions

### Issue: Weird Rotations

**Cause**: Different bind poses
**Solution**: 
1. Check both models have similar rest poses
2. Try T-pose normalization
3. Use embedded transforms if containers are rotated

### Issue: Feet Sliding / Hand Misalignment

**Cause**: Different proportions
**Solution**:
- Position scaling is automatic
- For precise foot contact, IK solvers would be needed (not yet implemented)

### Issue: No Movement

**Cause**: Bone mapping incorrect
**Solution**:
1. Check bone names match expected patterns
2. Verify mapping with `getMappingInfo()`
3. Add manual mappings as needed

### Issue: Root Motion Scale Wrong

**Cause**: Proportion ratio calculation
**Solution**:
- Ensure both models have similar bone chains
- Check that major bones are mapped (spine, legs)

## Performance Characteristics

- **Initialization**: O(n²) for bone mapping, O(n) for bind pose computation
- **Per-frame retargeting**: O(m) where m = number of keyframes
- **Memory**: O(n) per skeleton for bind pose data

Precomputation makes runtime very efficient - quaternion multiply operations are fast.

## Comparison to Three.js SkeletonUtils

The built-in `SkeletonUtils.retargetClip()` is simpler but less robust:

| Feature | SkeletonUtils | This Implementation |
|---------|---------------|---------------------|
| Bind pose handling | Limited | Full support |
| Scale compensation | No | Yes |
| Proportion ratio | No | Yes |
| World space alignment | No | Yes |
| Embedded transforms | No | Yes |
| T-pose normalization | No | Yes |

## References

- [upf-gti/retargeting-threejs Algorithm](https://github.com/upf-gti/retargeting-threejs/blob/main/docs/Algorithm.md)
- [SketchPunk's Retargeting Tutorial](https://github.com/sketchpunk/FunWithWebGL2/tree/master/lesson_132_animation_retargeting)
- Unreal Engine 5 IK Retargeter
- Unity Humanoid Avatar System
- MotionBuilder HumanIK

## Future Enhancements

Possible improvements:
1. **IK Solvers** - For precise hand/foot placement
2. **Twist Bone Distribution** - Smooth shoulder/forearm twist
3. **Animation Warping** - Time/stretch correction
4. **Additive Layers** - Breathing, secondary motion
5. **Grounding** - Automatic foot-floor contact

These would bring the system closer to commercial tools but add significant complexity.
