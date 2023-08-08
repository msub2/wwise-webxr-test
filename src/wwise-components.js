let AK = {};
let numGameObjects = [];
let WwiseLoaded = false;

function CHECK_RESULT(result) {
  if (result !== AK.AKRESULT.Success) {
    console.error(`[Wwise]: Error: ${result}`);
  }
}

AFRAME.registerComponent('wwise', {
  schema: {
    banks: { type: 'array', default: [] },
    initialMemory: { type: 'number', default: 64 * 1024 * 1024 }
  },

  prerun: function () {
    AK.FS_createPreloadedFile('/', "Init.bnk", 'res/soundbanks/Init.bnk', true, false);
    AK.FS_createPreloadedFile('/', "Main.bnk", 'res/soundbanks/Main.bnk', true, false);
  },

  main: function () {
    // Organize functions to live under namespaces e.g. AK.SoundEngine.Func instead of AK.SoundEngine_Func
    AK.organizeNamespaces();

    // Initialize all Wwise components
    AK.MemoryMgr.Init();
    AK.StreamMgr.Create();
    AK.SoundEngine.Init();
    AK.MusicEngine.Init();
    AK.SpatialAudio.Init();
    AK.SoundEngine.LoadBank("Init.bnk");
    AK.SoundEngine.LoadBank("Main.bnk");

    WwiseLoaded = true;
    document.dispatchEvent(new CustomEvent('wwise-loaded'));
    window.AK = AK;
  },

  init: function () {
    AK['preRun'] = this.prerun;
    AK['onRuntimeInitialized'] = this.main;
    // AK['INITIAL_MEMORY'] = this.data.initialMemory;
    WwiseModule(AK);

    // We want to load banks once Wwise has initialized
    document.addEventListener('wwise-loaded', () => {
      document.dispatchEvent(new CustomEvent('wwise-banks-loaded'));
    })
  },

  tick: function (time, timeDelta) {
    if (WwiseLoaded) {
      AK.SoundEngine.RenderAudio();
    }
  }
});

AFRAME.registerComponent('wwise-listener', {
  schema: {

  },

  init: function () {
    this.id = 0n;

    this.transform;
    this.position;
    this.orientationFront;
    this.orientationTop;
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.head = document.querySelector('#head');
    this.headRot = new THREE.Quaternion();

    document.addEventListener('wwise-loaded', () => {
      this.transform = new AK.AkWorldTransform();
      this.position = new AK.AkVector64();
      this.orientationFront = new AK.AkVector();
      this.orientationTop = new AK.AkVector();
      AK.SoundEngine.RegisterGameObj(this.id, "My Default Listener");
      AK.SoundEngine.SetDefaultListeners(this.id, 1);

      let cfg = new AK.AkChannelConfig(2, 0x1|0x2);
      AK.SoundEngine.SetListenerSpatialization(this.id, true, cfg);
    })
  },

  tick: function (time, timeDelta) {
    if (WwiseLoaded) {
      this.head.object3D.getWorldQuaternion(this.headRot);
      this.forward.set(0, 0, 1).applyQuaternion(this.headRot).normalize();
      this.up.set(0, 1, 0).applyQuaternion(this.headRot).normalize();
      this.position.x = this.el.object3D.position.x;
      this.position.y = this.el.object3D.position.y;
      this.position.z = this.el.object3D.position.z;
      this.orientationFront.x = this.forward.x;
      this.orientationFront.y = this.forward.y;
      this.orientationFront.z = this.forward.z;
      this.orientationTop.x = this.up.x;
      this.orientationTop.y = this.up.y;
      this.orientationTop.z = this.up.z;

      this.transform.Position = this.position;
      this.transform.SetOrientation(this.orientationFront, this.orientationTop);
      CHECK_RESULT(AK.SoundEngine.SetPosition(this.id, this.transform, AK.AkSetPositionFlags.Default));
    }
  }
});

AFRAME.registerComponent('wwise-gameobject', {
  schema: {
    name: { type: 'string', default: '' }
  },

  init: function () {
    this.id;

    this.transform;
    this.position;
    this.orientationFront;
    this.orientationTop;
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);

    document.addEventListener('wwise-loaded', () => {
      numGameObjects.push(this.data.name);
      this.id = BigInt(numGameObjects.length);
      CHECK_RESULT(AK.SoundEngine.RegisterGameObj(this.id, this.data.name));

      this.transform = new AK.AkWorldTransform();
      this.position = new AK.AkVector64();
      this.orientationFront = new AK.AkVector();
      this.orientationTop = new AK.AkVector();
      this.position.x = this.el.object3D.position.x;
      this.position.y = this.el.object3D.position.y;
      this.position.z = this.el.object3D.position.z;
      this.orientationFront.x = this.forward.x;
      this.orientationFront.y = this.forward.y;
      this.orientationFront.z = this.forward.z;
      this.orientationTop.x = this.up.x;
      this.orientationTop.y = this.up.y;
      this.orientationTop.z = this.up.z;
      this.transform.Position = this.position;
      this.transform.SetOrientation(this.orientationFront, this.orientationTop);
      CHECK_RESULT(AK.SoundEngine.SetPosition(this.id, this.transform, AK.AkSetPositionFlags.Emitter));
    })
  }
});


AFRAME.registerComponent('wwise-event', {
  schema: {
    eventName: { type: 'string' },
    enableOcclusion: { type: 'bool', default: false },
    listener: { type: 'selector' },
    obstructors: { type: 'string', default: '' },
    autostart: { type: 'bool', default: false }
  },

  init: function () {
    this.listenerPos = new THREE.Vector3();
    this.worldPos = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.listenerCast = new THREE.Raycaster();
    this.gameObject = this.el.components['wwise-gameobject'];

    if (this.data.enableOcclusion) {
      this.obstructors = Array.prototype.slice.call(document.querySelectorAll(this.data.obstructors)).map(ob => ob.object3D);
    }

    document.addEventListener('wwise-banks-loaded', () => {
      if (this.data.autostart) {
        AK.SoundEngine.PostEvent(this.data.eventName, this.gameObject.id);
      }
    });
  },

  tick: function (time, timeDelta) {
    if (!WwiseLoaded) return;
    if (this.data.enableOcclusion) this.raycast();
  },

  raycast: function () {
    // Get world positions of listener and event instance
    this.data.listener.object3D.getWorldPosition(this.listenerPos);
    this.el.object3D.getWorldPosition(this.worldPos);

    // Get direction for first ray to point, distance to travel, then update raycaster ray
    this.direction.subVectors(this.listenerPos, this.worldPos).normalize();
    this.distance = this.worldPos.distanceTo(this.listenerPos);
    this.listenerCast.far = this.distance;
    this.listenerCast.set(this.worldPos, this.direction);

    const intersecting = this.listenerCast.intersectObjects(this.obstructors);
    // little clunky, probably need to tune in project some more
    CHECK_RESULT(AK.SoundEngine.SetObjectObstructionAndOcclusion(this.gameObject.id, 0n, intersecting.length * .2, (intersecting.length * .2) / 2))
  }
});

AFRAME.registerComponent('footstepper', {
  schema: {

  },

  init: function () {
    this.gameObject = this.el.components['wwise-gameobject'];
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.head = document.querySelector('#head');

    document.addEventListener('wwise-banks-loaded', () => {
      this.el.parentEl.addEventListener('teleported', e => {
        this.gameObject.position.y = e.detail.newPosition.y;
        this.gameObject.transform.Position = this.gameObject.position;
        AK.SoundEngine.PostEvent("Footstep", this.gameObject.id);
      })
    });
  }
});
