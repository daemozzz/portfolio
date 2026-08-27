---
title: Updated the 3D model page to support GBL for textures
date: 2026-08-24
category: 3D Modeling Fun
tags: [STL, GBL, Textures Mesh for 3d models, updated Model viewer API]
excerpt: This page was a placeholder, which is now functional with an improved viewer and samples of my work.
---

# Updated the 3D model page to support .GBL for textures & Added Some
  
## Enhancing this Fun Page
This is evolving, the more i added to it the more i wanted to add, but i also realized these GBL files are 40+mb and not ideal for web viewing.  This should work well with a quick connection or when i add more simple STL files that dont have color or texture.

I made a bunch of models when i was playing the meshy AI, with a bunch of different workflows to test what the tools could do.  Using real photos, sketches ive drawn, sketches modified by nannobanna, text to image/video/model, and using their multiple angle 2d to 3d. 

The models here are some of the better results, but i didnt back-up all my models before the trial ended.  Ill do it again in the future likely and grab them then to add here.  I could do a deeper dive on the methods for each at some point.  

Adding the background city was more a test to see if Opus could handle it well.  It took a few rounds, but i like how the lighting controls also control that background.  The presentation mode works well, and i had to fidget with the zoom controls especially on mobile, where the tap to interface w/ the API didnt exist.   

## Next Steps

This worked out better than i expected really, and i want to keep iterating on it to see what more we can animate external to the 3d models. I wonder if you can click on stuff in the background to make it explode - how can we make a simple game this way. Concept:
- create 3d model for game facing away from screen.  Game like first 3d contra shooting foward, where you click interacts with background animations.  simple, just a trial.

I also want to try exporting a GBL with animation and seeing how modeling that in this UI may work. 

## Changelog of Page Updates this week

- Added GLB model support alongside existing STL, using Three.js GLTFLoader — enables full color/texture rendering (skin, materials) instead of flat single-color geometry
- Set per-model default camera view (angle, zoom) so each gallery model opens framed the way it looks best, instead of one generic default
- Added auto-rotate toggle, with the option to have any given model spin automatically as its default state
-Set default model to auto-load and spin on page open, so visitors see something immediately instead of an empty viewer
-Added a spotlight with adjustable intensity slider, pushed to an intentionally extreme max for a blown-out highlight look, not just subtle lighting
-Added a color picker for the spotlight (default/purple/red/blue presets) to quickly reskin the mood/lighting of a scene
-Added a loading indicator with live progress % on each model card, since large files (40MB+) previously looked frozen with no feedback
-Added a procedural animated cyberpunk city backdrop, generated entirely in-browser (no external assets) as a toggleable environment behind the model
-Linked the city's neon window colors to the spotlight color picker, so switching the light theme re-tints the whole skyline to match
-Optimized the city lighting for performance, consolidating hundreds of individual light objects into a single efficient point-cloud render pass
- Improvements to nav, using zoom wheel and mobile pinch/zoom
- Added presentation mode to go full screen



---

