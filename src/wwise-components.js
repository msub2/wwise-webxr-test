let AK = {};
let WwiseLoaded = false;

function CHECK_RESULT(result) {
  if (result !== AK.Ak_Success) {
    console.error(`[Wwise]: Error: ${result.constructor.name}`);
  }
}

AFRAME.registerComponent('wwise', {
  schema: {
    banks: { type: 'array', default: [] },
    initialMemory: { type: 'number', default: 64 * 1024 * 1024 }
  },

  loadBank: function (name) {
    const bankhandle = {};
    //CHECK_RESULT(gSystem.loadBankFile("/" + name, FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle));
    return bankhandle.val;
  },

  prerun: function () {
    AK.FS_createPreloadedFile('/', "Init.bnk", 'res/soundbanks/Init.bnk', true, false);
    AK.FS_createPreloadedFile('/', "Main.bnk", 'res/soundbanks/Main.bnk', true, false);
  },

  main: function () {
    const namespaces = {
      Comm: { value: {}, enumerable: true },
      Instrument: { value: {}, enumerable: true },
      MemoryMgr: { value: {}, enumerable: true },
      Monitor: { value: {}, enumerable: true },
      MusicEngine: { value: {}, enumerable: true },
      SoundEngine: { value: {
        DynamicDialogue: {},
        DynamicSequence: {},
        Query: {}
      }, enumerable: true },
      SpatialAudio: { value: {
        ReverbEstimation: {},
      }, enumerable: true },
      SpeakerVolumes: { value: {}, enumerable: true },
      StreamMgr: { value: {}, enumerable: true },
    };
    const nsKeys = Object.keys(namespaces);
    Object.keys(AK).forEach(key => {
      for (const nsKey in nsKeys) {
        if (key.includes(nsKeys[nsKey])) {
          const values = key.split('_');
          if (values.length == 2) {
            const namespace = values[0];
            const item = values[1];
            namespaces[namespace].value[item] = AK[key];
          } else if (values.length == 3) {
            const namespace1 = values[0];
            const namespace2 = values[1];
            const item = values[2];
            namespaces[namespace1].value[namespace2][item] = AK[key];
          }
          delete(AK[key]);
          break;
        }
      }
    })
    AK = Object.defineProperties(AK, namespaces);

    AK.MemoryMgr.Init();
    AK.StreamMgr.Create();
    AK.SoundEngine.Init();
    AK.MusicEngine.Init();
    AK.SpatialAudio.Init();
    AK.SoundEngine.LoadBank("Init.bnk");
    AK.SoundEngine.LoadBank("Main.bnk");

    const MY_DEFAULT_LISTENER = 0n;
    const MY_EMITTER = 1n;
    AK.SoundEngine.RegisterGameObj(MY_DEFAULT_LISTENER, "My Default Listener");
    AK.SoundEngine.SetDefaultListeners(MY_DEFAULT_LISTENER, 1);
    AK.SoundEngine.RegisterGameObj(MY_EMITTER, "My Emitter");
    AK.SoundEngine.PostEvent("Ambience", MY_EMITTER);
    setInterval(AK.SoundEngine.RenderAudio, 20);

    WwiseLoaded = true;
    document.dispatchEvent(new CustomEvent('wwise-loaded'));
    window.AK = AK;
  },

  init: function () {
    AK['preRun'] = this.prerun;
    AK['onRuntimeInitialized'] = this.main;
    // AK['INITIAL_MEMORY'] = this.data.initialMemory;
    WwiseModule(AK);

    // We want to load banks once FMOD has initialized
    document.addEventListener('wwise-loaded', () => {
      // Load default Master Bank and strings bank
      this.loadBank("Init.bnk");
      this.loadBank("Master.bnk");
      // Load any extra banks passed in
      for (const bank in this.data.banks) {
        this.loadBank(bank);
      }
      document.dispatchEvent(new CustomEvent('wwise-banks-loaded'));
    })
  },

  tick: function (time, timeDelta) {
    if (WwiseLoaded) {
      // CHECK_RESULT(gSystem.update());
    }
  }
});

AFRAME.registerComponent('wwise-listener', {
  schema: {

  },

  init: function () {
    // this.listenerAttributes = {
    //   position: { x: 0, y: 0, z: 0 },
    //   velocity: { x: 0, y: 0, z: 0 },
    //   forward: { x: 0, y: 0, z: 1 },
    //   up: { x: 0, y: 1, z: 0 },
    // };
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.head = document.querySelector('#head');
  },

  tick: function (time, timeDelta) {
    if (WwiseLoaded) {
      // this.forward.set(0, 0, 1).applyQuaternion(this.head.object3D.quaternion).normalize();
      // this.up.set(0, 1, 0).applyQuaternion(this.head.object3D.quaternion).normalize();
      // this.listenerAttributes.position = { x: this.el.object3D.position.x, y: this.el.object3D.position.y, z: this.el.object3D.position.z };
      // this.listenerAttributes.forward = { x: this.forward.x, y: this.forward.y, z: this.forward.z };
      // this.listenerAttributes.up = { x: this.up.x, y: this.up.y, z: this.up.z };
      // gSystem.setListenerAttributes(0, this.listenerAttributes, null);
    }
  }
});

AFRAME.registerComponent('wwise-event', {
  schema: {
    path: { type: 'string' },
    enableOcclusion: { type: 'bool', default: false },
    listener: { type: 'selector' },
    obstructors: { type: 'string' },
    autostart: { type: 'bool', default: false }
  },

  init: function () {
    this.description = {};
    this.instance = {};
    this.outval = {};

    this.listenerPos = new THREE.Vector3();
    this.worldPos = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.listenerCast = new THREE.Raycaster();

    if (this.data.enableOcclusion) {
      this.obstructors = Array.prototype.slice.call(document.querySelectorAll(this.data.obstructors)).map(ob => ob.object3D);
    }

    document.addEventListener('wwise-banks-loaded', () => {
      // CHECK_RESULT(gSystem.getEvent(`event:${this.data.path}`, this.outval));
      // this.description = this.outval.val;
      // CHECK_RESULT(this.description.createInstance(this.outval));
      // this.instance = this.outval.val;

      // const { x, y, z } = this.el.object3D.position;
      // CHECK_RESULT(this.instance.set3DAttributes({
      //   position: { x, y, z },
      //   velocity: { x: 0, y: 0, z: 0 },
      //   forward: { x: 0, y: 0, z: 1 },
      //   up: { x: 0, y: 1, z: 0 },
      // }));

      // if (this.data.autostart) {
      //   CHECK_RESULT(this.instance.start());
      // }
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
    // CHECK_RESULT(this.instance.setParameterByName("Obstructors", intersecting.length, false));
  }
});

AFRAME.registerComponent('footstepper', {
  schema: {

  },

  init: function () {
    this.event = this.el.components['wwise-event'];
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.head = document.querySelector('#head');

    document.addEventListener('wwise-banks-loaded', () => {
      const { x, y, z } = this.el.parentEl.object3D.position;
      // CHECK_RESULT(this.event.instance.set3DAttributes({
      //   position: { x, y, z },
      //   velocity: { x: 0, y: 0, z: 0 },
      //   forward: { x: 0, y: 0, z: 1 },
      //   up: { x: 0, y: 1, z: 0 },
      // }));

      this.el.parentEl.addEventListener('teleported', e => {
        this.forward.set(0, 0, 1).applyQuaternion(this.head.object3D.quaternion).normalize();
        this.up.set(0, 1, 0).applyQuaternion(this.head.object3D.quaternion).normalize();
        const { x, y, z } = e.detail.newPosition;
        // CHECK_RESULT(this.event.instance.set3DAttributes({
        //   position: { x, y, z },
        //   velocity: { x: 0, y: 0, z: 0 },
        //   forward: { x: this.forward.x, y: this.forward.y, z: this.forward.z },
        //   up: { x: this.up.x, y: this.up.y, z: this.up.z },
        // }));
        // this.event.instance.start();
      })
    });
  }
});
