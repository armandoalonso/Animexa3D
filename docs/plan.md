# Desktop 3D Animation Viewer – Architecture and Implementation Plan

We will build a local (Electron-based) desktop app using web technologies. The Electron framework lets us package a Chromium-based UI with Node.js APIs for file I/O, creating a cross-platform desktop app
medium.com
. For 3D rendering and animation, we’ll use three.js, a popular WebGL library
medium.com
. The UI will include a 3D viewport (using Three.js’s WebGLRenderer), orbit controls, and HTML/JS UI elements (lists, sliders) for animation management. Below is a plan with detailed components and code examples.

Tech Stack

Electron: Provides a desktop shell (Chromium + Node) for cross-platform apps
medium.com
. This lets us use Node’s filesystem APIs to load/save files (models, images) locally without any server or cloud.

Three.js: For WebGL-based 3D rendering and animation. We’ll use Three.js loaders (GLTFLoader, FBXLoader) and utilities (AnimationMixer, OrbitControls, SkeletonUtils).

3D Model Formats: Support GLB/GLTF natively (via GLTFLoader
threejs.org
) and FBX (via FBXLoader
threejs.org
). If needed, we can convert FBX to GLTF offline, but Three.js’s FBXLoader allows direct loading of .fbx files
threejs.org
.

UI: Standard HTML/CSS/JS or a UI library (e.g. React) can be used inside Electron. For simplicity, plain HTML buttons/sliders are sufficient. We’ll use OrbitControls (an official Three.js addon) to enable mouse-based camera orbit, pan and zoom
medium.com
. This control “quickly sets up a simple solution for panning, zooming, and changing the orientation of a camera with the mouse”
medium.com
.

3D Viewport and Controls

In the main viewport, we’ll create a Three.js scene with a perspective camera and renderer. Example initialization (in an Electron renderer process):

// Import Three.js and controls
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create renderer with a canvas in the Electron window
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Set up scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3); 

// OrbitControls for mouse interaction (pan, zoom, rotate):contentReference[oaicite:8]{index=8}
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // smooth controls


We enable preserveDrawingBuffer:true on the renderer so that we can capture screenshots of the canvas later
stackoverflow.com
.

The OrbitControls (from three/examples/jsm/controls/OrbitControls.js) handles mouse/touch camera navigation effortlessly
medium.com
.

A basic render loop in Electron’s renderer script would then update controls and render each frame:

function animate() {
  requestAnimationFrame(animate);
  controls.update();      // update camera controls
  renderer.render(scene, camera);
}
animate();


Resize handling should update camera.aspect and renderer.setSize as usual.

Loading 3D Models (GLB/FBX) and Listing Animations
GLB/GLTF

We use the Three.js GLTFLoader to load glTF 2.0 models
threejs.org
. This loader returns an object with scene (the model’s scene graph) and animations (an array of AnimationClip objects). Example:

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
gltfLoader.load('path/to/model.glb', gltf => {
  scene.add(gltf.scene);            // add model to scene
  const clips = gltf.animations;    // array of AnimationClip
  // Populate UI list of animations, e.g.:
  clips.forEach((clip, i) => {
    addAnimationToList(clip.name, i);
  });
  // Store for playback later
  window.currentModel = { scene: gltf.scene, clips };
}, error => {
  console.error('Error loading GLB:', error);
});


Citing Three.js docs: This code uses GLTFLoader in async style (using callbacks). The Three.js documentation shows a similar example (loading and adding a GLTF scene)
threejs.org
.

FBX

For .fbx files, we use FBXLoader (also an official Three.js loader)
threejs.org
. Example:

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const fbxLoader = new FBXLoader();
fbxLoader.load('path/to/model.fbx', object => {
  scene.add(object);
  // If FBX contains animations, they may be in object.animations
  const clips = object.animations || [];
  clips.forEach((clip, i) => addAnimationToList(clip.name, i));
  window.currentModel = { scene: object, clips };
}, error => {
  console.error('Error loading FBX:', error);
});


The Three.js docs example likewise shows loading an FBX and adding it to the scene
threejs.org
.

File Conversion Note: If needed, one could use tools like gltf-pipeline or Blender scripting to convert FBX to GLTF offline. But using Three.js’s loader lets us support FBX directly without external steps.

Animation Playback and Timeline

Once a model is loaded and its animations listed, selecting an animation should play it. We use Three.js’s AnimationMixer for this. For each clip:

const mixer = new THREE.AnimationMixer(window.currentModel.scene);
let activeAction = null;

// When user clicks on animation #i:
function playAnimation(index) {
  // Stop previous action
  if (activeAction) activeAction.stop();

  // Create and play action for the selected clip
  const clip = window.currentModel.clips[index];
  activeAction = mixer.clipAction(clip);
  activeAction.reset().play();
}


AnimationMixer drives the bones/transforms of the model.

Each AnimationClip (from gltf.animations or fbx.animations) can be applied via mixer.clipAction(clip).

We should call mixer.update(deltaTime) on each frame to advance the animation:

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  mixer.update(delta); 
  controls.update();
  renderer.render(scene, camera);
}

Listing and UI

In the UI, we can list animations (e.g. in a sidebar) with buttons or thumbnails. For example, after loading:

function addAnimationToList(name, index) {
  const list = document.getElementById('animation-list');
  const btn = document.createElement('button');
  btn.textContent = name || `Anim ${index}`;
  btn.onclick = () => playAnimation(index);
  list.appendChild(btn);
}


This creates a simple list of buttons labeled with clip names (if provided by the model). Clicking a button calls playAnimation(index).

Timeline Scrubbing

We will add a timeline slider to scrub through the animation. The slider range will correspond to the clip’s duration. For example, an HTML <input type="range">:

<input type="range" id="time-slider" min="0" max="1" step="0.001">


And JavaScript to tie it to the mixer:

const slider = document.getElementById('time-slider');

slider.oninput = () => {
  if (!activeAction) return;
  const clip = activeAction.getClip();
  const duration = clip.duration;
  const time = slider.value * duration;
  mixer.setTime(time); // Jump to exact time (seconds)
};


When the slider moves, we compute time = sliderValue * clip.duration.

We call mixer.setTime(time) to scrub the mixer to that timestamp. Three.js’s AnimationMixer.setTime() will update all actions to that exact time
stackoverflow.com
. As documented:

“Scrub/slide to an exact time in seconds: mixer.setTime(exactTimeInSeconds).”
stackoverflow.com

In the render loop we call mixer.update(delta) (or not at all if we only want frozen frames). If we want continuous playback when the user isn’t dragging, we keep the loop updating as above.

We should also update the slider as the animation plays. On each frame after mixer.update, do:

if (activeAction) {
  const clip = activeAction.getClip();
  slider.value = (activeAction.time / clip.duration).toFixed(3);
}


This way, the slider reflects the current time during playback.

Animation Retargeting (Bone Mapping)

The app will support loading a second character (with its own skeleton and animations) and copying (“retargeting”) animations from one rig to another. For now, we implement a simple bone-mapping retarget without full IK.

The user can drag in a target model (with a skeleton) and a source model that has an animation.

We’ll provide a basic UI (e.g. two dropdowns or lists of bone names) to map source bones to target bones. For this version, we can assume the skeletons are similar (e.g. Mixamo rigs) so an automatic name-based mapping or a simple manual mapping suffices.

Once the mapping is defined, we use Three.js’s SkeletonUtils.retargetClip to apply a source clip to the target skeleton. Example usage (inspired by Three.js forums):

import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Assume sourceMesh (SkinnedMesh with animation) and targetMesh (SkinnedMesh to retarget to)
const sourceSkeleton = sourceMesh.skeleton;
const sourceClip = sourceMesh.animations[animIndex];

// Optionally define retarget options if names differ (default uses matching names)
const retargetOptions = {
  // e.g. map: { Hips: 'root', Spine: 'chest', ... }
};

// Perform retarget
const retargetedClip = SkeletonUtils.retargetClip(targetMesh, sourceSkeleton, sourceClip, retargetOptions);

// Play on target
const targetMixer = new THREE.AnimationMixer(targetMesh);
targetMixer.clipAction(retargetedClip).play();


Here we cite usage from discussions: users have successfully retargeted BVH/FBX animations onto glTF models using SkeletonUtils.retargetClip()
discourse.threejs.org
. The code example in that forum demonstrates calling SkeletonUtils.retargetClip(targetSkin, sourceSkeleton, sourceClip, options) and then playing it with an AnimationMixer
discourse.threejs.org
. For example:

const retargetedClip = SkeletonUtils.retargetClip(targetSkin, sourceSkeleton, sourceClip);
const mixer2 = new THREE.AnimationMixer(targetSkin);
mixer2.clipAction(retargetedClip).play();


discourse.threejs.org
.

Initially we can assume the source and target skeletons have matching bone names or a simple one-to-one mapping. The UI can allow the user to match differing bone names. In future iterations, we can add inverse-kinematics constraints and more advanced retargeting. But for now, SkeletonUtils.retargetClip provides a straightforward method to transfer animation data between skeletons
discourse.threejs.org
discourse.threejs.org
.

Exporting Frames / Image Sequence

The main purpose of the app is to export a series of PNG images capturing the animation over time. We will render the viewport at specified intervals and save each frame as a PNG. Since this is a desktop app, we can use Node’s fs module in Electron to write files.

Steps to capture frames:

Configure Renderer: When creating THREE.WebGLRenderer, we set preserveDrawingBuffer: true
stackoverflow.com
 so that toDataURL() works reliably. (Without it, the drawing buffer may be cleared each frame and toDataURL() can return a blank image
stackoverflow.com
.)

Render to Canvas and Capture: For each desired timestamp (e.g. every 0.1 second, or every frame), we call:

mixer.setTime(time);
renderer.render(scene, camera);
const dataURL = renderer.domElement.toDataURL('image/png');


As shown on StackOverflow, capturing an image in Three.js is done by calling renderer.render(...) followed by renderer.domElement.toDataURL()
stackoverflow.com
. (We might use the snippet renderer.render(scene, camera); renderer.domElement.toDataURL();
stackoverflow.com
 as a reference.)

Save PNG via Node: We strip the data URL prefix and save the base64 data:

const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
fs.writeFile(`frame_${t}.png`, base64Data, 'base64', err => {
  if (err) console.error(err);
});


(In Electron’s renderer, use const fs = require('fs') or use a preload script to enable fs.) Alternatively, we can use canvas.toBlob and write the blob buffer. The key point is that Electron allows us to save directly to disk, so no cloud service or server is needed.

Configurable Resolution: Before capturing, we set the renderer size to the target resolution:

renderer.setSize(userWidth, userHeight);
renderer.render(scene, camera);
// ...capture...


This gives control over output resolution. We also allow “native” resolution (no resize) as an option.

By repeating the above for each frame, we generate a sequence of PNGs. For example, to capture 30 frames over a 1-second animation at 0.033s intervals:

const duration = activeAction.getClip().duration;
const frameCount = 30;
for (let i = 0; i <= frameCount; i++) {
  const t = (i/frameCount) * duration;
  mixer.setTime(t);
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
  fs.writeFile(`frame_${i}.png`, base64Data, 'base64', err => { if(err) console.error(err); });
}


This loop relies on renderer.domElement.toDataURL() to get image data
stackoverflow.com
. (In practice, for large sequences we may manage performance or consider offscreen rendering, but for moderate lengths this direct method works.)

Summary of Key Code Components

Loading models:

const loader = new GLTFLoader();
loader.load('model.glb', gltf => scene.add(gltf.scene));  // add GLTF model:contentReference[oaicite:27]{index=27}

const fbxLoader = new FBXLoader();
fbxLoader.load('model.fbx', obj => scene.add(obj));        // add FBX model:contentReference[oaicite:28]{index=28}


Orbit Controls:

const controls = new OrbitControls(camera, renderer.domElement);  // allows pan/zoom/orbit:contentReference[oaicite:29]{index=29}


Animation playback:

const mixer = new THREE.AnimationMixer(model);
const action = mixer.clipAction(gltfClip);
action.play();
// in render loop: mixer.update(clock.getDelta());


Timeline scrubbing:

// HTML: <input type="range" id="time-slider" ...>
slider.oninput = () => {
  const duration = action.getClip().duration;
  mixer.setTime(slider.value * duration);  // scrub to time:contentReference[oaicite:30]{index=30}
};


Animation retargeting:

// Assuming sourceMesh, targetMesh, and a chosen clip:
const retargetedClip = SkeletonUtils.retargetClip(
  targetMesh, sourceMesh.skeleton, sourceClip, {} );
const mixer2 = new THREE.AnimationMixer(targetMesh);
mixer2.clipAction(retargetedClip).play();


This uses Three.js’s SkeletonUtils.retargetClip to map one rig’s animation onto another
discourse.threejs.org
discourse.threejs.org
.

Exporting images:

const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
renderer.setSize(outW, outH);
// For each frame:
renderer.render(scene, camera);
const url = renderer.domElement.toDataURL('image/png');  // capture PNG:contentReference[oaicite:33]{index=33}
// Save via Node fs:
const data = url.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(`frame_${i}.png`, data, 'base64');

Example: Overall Flow (Pseudo)

App startup: Initialize Electron, create window, load HTML/JS.

Load Character: User selects/drag-drops a GLB/FBX file. JS loads it into the Three.js scene (with loaders above).

Animation List: Extract gltf.animations or fbx.animations. Display their names or thumbnails in a sidebar with clickable items.

Play Animation: On click, stop any current action, mixer.clipAction(chosenClip).play(), and start updating mixer in the render loop.

Timeline: Show a range slider. On slider move, call mixer.setTime(...) to jump animation to that time
stackoverflow.com
. Update the slider as the animation plays.

Retarget (optional): If user loads a second model, show UI to select source clip and perform bone mapping. Use SkeletonUtils.retargetClip to transfer the clip, then play on the second character
discourse.threejs.org
discourse.threejs.org
.

Export Images: Provide an “Export” button. When triggered, loop over times (e.g. 0 to clip.duration) and for each: set mixer time, render, toDataURL(), and save via fs.writeFile. Inform the user when done.

Inspiration and References

An example interface is provided by the open-source Mesh2Motion web app, which similarly lets users import a 3D model and play animations (similar to Mixamo)
github.com
. Its UI (shown below) has a 3D view, animation list, and timeline controls. Our app will have a modern, clean look akin to that design:

Figure: Mesh2Motion’s web app UI (from its README) showing a 3D fox model, an animation thumbnail list, and playback controls
github.com
.

This plan adapts these ideas for an Electron desktop application, using Three.js for all 3D and animation work
medium.com
medium.com
. The cited code examples and methods (GLTFLoader, OrbitControls, AnimationMixer, SkeletonUtils, and canvas capture) will guide the implementation. Each component can be developed and tested incrementally, ensuring the final app can import models, browse and play animations, retarget between rigs, and export image sequences as specified.

Sources: We leverage Three.js documentation and community examples to inform our implementation (e.g. official loader examples
threejs.org
threejs.org
, OrbitControls usage
medium.com
, and forum solutions for retargeting and capture
discourse.threejs.org
discourse.threejs.org
stackoverflow.com
stackoverflow.com
). These references confirm the viability of each chosen approach.


---

