var FollowCamera = pc.createScript("followCamera");
FollowCamera.attributes.add("target", { type: "entity", title: "Target" });
FollowCamera.attributes.add("distance", {
  type: "number",
  default: 4,
  title: "Distance",
});

FollowCamera.prototype.initialize = function () {
  this.pos = new pc.Vec3();
  this.offset = new pc.Vec3();
};

FollowCamera.prototype.postUpdate = function (t) {
  if (this.target) {
    this.offset.set(0.75, 1, 0.75).scale(this.distance);
    this.pos.copy(this.target.getPosition()).add(this.offset);
    this.pos.lerp(this.entity.getPosition(), this.pos, 0.1);
    this.entity.setPosition(this.pos);
  }
};

var Movement = pc.createScript("movement");
Movement.attributes.add("speed", {
  type: "number",
  default: 0.1,
  min: 0.05,
  max: 0.5,
  precision: 2,
});

Movement.prototype.initialize = function () {
  this.force = new pc.Vec3();
  this.spawnPos = this.entity.getPosition().clone();

  // Global flags for touch
  this.isTouching = false;
  this.touchX = 0;
  this.touchY = 0;

  // Listen to the window directly - more reliable in Capacitor
  window.addEventListener("mousedown", (e) => {
    this.isTouching = true;
    this.updateCoords(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (this.isTouching) this.updateCoords(e);
  });
  window.addEventListener("mouseup", () => {
    this.isTouching = false;
  });

  window.addEventListener("touchstart", (e) => {
    this.isTouching = true;
    this.updateCoords(e.touches[0]);
  });
  window.addEventListener("touchmove", (e) => {
    this.updateCoords(e.touches[0]);
  });
  window.addEventListener("touchend", () => {
    this.isTouching = false;
  });
};

Movement.prototype.updateCoords = function (data) {
  this.touchX = data.clientX || data.x;
  this.touchY = data.clientY || data.y;
};

Movement.prototype.update = function (e) {
  if (this.entity.getPosition().y < -1) return this.teleport(this.spawnPos);

  const kb = this.app.keyboard;
  let s = 0;
  let i = 0;

  // 1. Keyboard Fallback
  if (kb && kb.isPressed) {
    if (kb.isPressed(pc.KEY_LEFT) || kb.isPressed(pc.KEY_A)) s = -this.speed;
    if (kb.isPressed(pc.KEY_RIGHT) || kb.isPressed(pc.KEY_D)) s += this.speed;
    if (kb.isPressed(pc.KEY_UP) || kb.isPressed(pc.KEY_W)) i = -this.speed;
    if (kb.isPressed(pc.KEY_DOWN) || kb.isPressed(pc.KEY_S)) i += this.speed;
  }

  // 2. Global Touch/Mouse
  if (this.isTouching) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.touchX < w * 0.4) s = -this.speed;
    else if (this.touchX > w * 0.6) s = this.speed;

    if (this.touchY < h * 0.4) i = -this.speed;
    else if (this.touchY > h * 0.6) i = this.speed;

    // If touching middle, force move forward
    if (s === 0 && i === 0) i = -this.speed;
  }

  this.force.set(s, 0, i);

  if (this.force.lengthSq() > 0) {
    this.force.normalize().scale(this.speed);
    const angle = 0.25 * -Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedX = this.force.x * cos - this.force.z * sin;
    const rotatedZ = this.force.z * cos + this.force.x * sin;
    this.force.set(rotatedX, 0, rotatedZ);

    if (this.entity.rigidbody) {
      this.entity.rigidbody.applyImpulse(this.force);
    }
  }
};

Movement.prototype.teleport = function (pos) {
  this.entity.rigidbody.teleport(pos);
  this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
  this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
};

var Teleporter = pc.createScript("teleporter");
Teleporter.attributes.add("target", { type: "entity", title: "Target Entity" });

Teleporter.prototype.initialize = function () {
  const onTriggerEnter = (result) => {
    if (result.script && result.script.movement) {
      const p = this.target.getPosition().clone();
      p.y += 0.5;
      result.script.movement.teleport(p);
    }
  };
  this.entity.collision.on("triggerenter", onTriggerEnter);
};
