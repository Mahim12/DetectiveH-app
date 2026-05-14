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
};

Movement.prototype.update = function (e) {
  if (this.entity.getPosition().y < -1) return this.teleport(this.spawnPos);

  const kb = this.app.keyboard;
  let s = 0;
  let i = 0;

  // Keyboard controls
  if (kb.isPressed(pc.KEY_LEFT) || kb.isPressed(pc.KEY_A)) s = -this.speed;
  if (kb.isPressed(pc.KEY_RIGHT) || kb.isPressed(pc.KEY_D)) s += this.speed;
  if (kb.isPressed(pc.KEY_UP) || kb.isPressed(pc.KEY_W)) i = -this.speed;
  if (kb.isPressed(pc.KEY_DOWN) || kb.isPressed(pc.KEY_S)) i += this.speed;

  // Touch controls
  const touches = this.app.touch ? this.app.touch.touches : [];
  if (touches.length > 0) {
    const touch = touches[0];
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (touch.x < w * 0.3) s = -this.speed;
    else if (touch.x > w * 0.7) s = this.speed;
    if (touch.y < h * 0.3) i = -this.speed;
    else if (touch.y > h * 0.7) i = this.speed;
  }

  this.force.set(s, 0, i);

  if (this.force.lengthSq() > 0) {
    this.force.normalize().scale(this.speed);
    // Rotate force to align with the camera angle
    const angle = 0.25 * -Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedX = this.force.x * cos - this.force.z * sin;
    const rotatedZ = this.force.z * cos + this.force.x * sin;
    this.force.set(rotatedX, 0, rotatedZ);

    this.entity.rigidbody.applyImpulse(this.force);
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
