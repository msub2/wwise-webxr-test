# Wwise + WebXR Test Scene

This repository contains a simple integration of Wwise into a web-based 3D environment that's WebXR-enabled.
The scene itself comes from Ada Rose Cannon's [aframe-xr-boilerplate](https://github.com/AdaRoseCannon/aframe-xr-boilerplate) project.
It also makes use of the WASM bindings I wrote myself over at [wwise.js](https://github.com/msub2/wwise.js).

## Running Locally

To run this demo scene locally, you'll need to have CORP/COEP headers set, as Wwise makes use of SharedArrayBuffer and requires cross-origin isolation. The easiest way to do this is with statikk:

```sh
npx statikk --coi
```
