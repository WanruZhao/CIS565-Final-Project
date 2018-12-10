GPU Rasterized And Ray Traced Real Time Rendering Using WebGL
======================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Final Project**

* Yuru Wang, Wanru Zhao
* Tested on: **Google Chrome 62.0.3202.94** on Windows 10, i7-7700HQ @ 2.5GHz 128GB, GTX 1050 Ti 8GB (personal computer) and **Google Chrome 71.0.3578.80** Windows 10, Intel(R) Core(TM) i7-8750H CPU@2.2GHz, GTX 1070 with Max-Q Design(Personal Laptop)

### Live Online
[Live Demo](https://wanruzhao.github.io/CIS565-Final-Project/)

### Demo Video/Gif

### Slides
[Slides](https://docs.google.com/presentation/d/1IV-hGhshcx--qwChoxhV8sUtsPJW2yRIfDSoRfvkCAE/edit?usp=sharing)

## Project Description ##
This project implements bybrid real time raytracing using WebGL. This project is originally inspired by Rigid Gems and referred to the hybrid rendering pipleline introduced in the presentation of SHINY PIXELS AND BEYOND: REAL-TIME RAYTRACING AT SEED.

A list of features implemented in this project is as follows:
* Rasterization and GBuffer: Stored the rasterized data (world position, normal, albedo color, material) in the gbuffer
* OBJ loading: loaded obj model with webgl-obj-loader
* Texture mapping: added texture to models, UV interpolation
* Ray traced reflection: ray traced specular reflection
* Ray traced refraction: used snell's law for ray's direction and include intenal reflection inside models based on critical angle.
* Ray traced soft/hard shadow
* Environment mapping
* Post processing (glow, DOF)
* Dispersion
* FXAA
* BVH and KDTree: constructed and flattened BVH tree on CPU, encode it in WebGL texture and traverse the tree on GPU

## Results ##

**Texture mapping**
![](images/texture.png)


**OBJ loading**
![](images/objLoading.png)


**Rasterization and GBuffer**

| Albedo | Material |
|------|------|
| ![](images/albedo.png) | ![](images/material.png) |

| Position | Normal |
|------|------|
| ![](images/position.png) | ![](images/normal.png) |

**Ray traced reflection pass**

| Ray depth = 2 | Ray Depth = 4 |
|------|------|
| ![](images/reflect_d_2.png) | ![](images/reflect_d_4.png) |

**Ray traced refraction pass**

| Ray depth = 2 | Ray Depth = 5 | Ray depth = 10 | Ray Depth = 20 |
|------|------|------|------|
| ![](images/refract_d_2.png) | ![](images/refract_d_5.png) | ![](images/refract_d_10.png) | ![](images/refract_d_20.png) |


**Combine separate Passes**

| Direct Lighting | Ray Traced Refelection | Ray Traced Refraction | Combined |
|------|------|------|------|
| ![](images/deferredPass.png) | ![](images/reflectPass.png) | ![](images/refractPass.png) | ![](images/combined.png) |

**BVH and KDTree**
![](images/BVH.png)

## Performance Analysis ##
 ![](images/performance.png) 

### Credits


### Milestone 1 - 2018.11.19
- WebGL framework
- Basic deferred shading
- Raytraced shadow (hard)
- Raytraced direct lighting



