"use strict";
const Pixel = require('./pixel.js');
const Point = require('./point.js');
const colors = require('./colors.js');
const MineFX = require('./mine-fx.js');

module.exports = class MinePoint extends Point {
  constructor ( game ) {
    super(game);
    const point = this;
    point.value = 0;
    point.type = 'mnp';
    point.typeUpdated = true;
    point.armedColor = [1,0.2,0.2];
    point.color = point.armedColor;
    point.armed = false;
    point.armedUpdated = true;
    point.countLength = 5;
    point.countDown = point.countLength;
    point.blowRadius = 5;

    setTimeout(function () {
      const factor = Math.round(Math.random() * 10);
      if (factor > 7) {
        point.color = colors.gold;
      } else {
        point.color = colors.white;
      }
    }, 1000);
  }

  render () {
    const point = this;

    return function ( screen ) {
      const armed = point.armed;

      let pixels = [];
      if (!point.game.getPointById(point.id) || !point.alive) {
        pixels.die = [];
        return pixels;
      }

      const sinTime = 1;//!armed ? 1 : Math.sin(parseFloat('0.'+ (new Date().getTime() / 1000).toString().split('.')[1]) * Math.PI);
      let color = !armed ? point.color : point.armedColor;
      let r = color[0] * sinTime;
      let g = color[1] * sinTime;
      let b = color[2] * sinTime;

      pixels.push(new Pixel(1, r, g, b, point.coords));

      return pixels;
    };
  }

  arm () {
    const point = this;

    if (!point.armed) {
      if (!point.game.server) new MineFX(point);
      point.armed = true;
      point.armedUpdated = true;
      point.updated = true;
    }
  }

  onCollision ( player, bodyIndex, scorerID ) {
    const point = this;
    const length = player.body.length;
    const rest = length - bodyIndex - 1;
    const scorer = player.game.getPlayerById(scorerID);
    if (scorer) scorer.addScore(rest * 10);

    if (!bodyIndex) {
      player.die();
    } else {
      player.drop(rest, bodyIndex, player.body.splice(bodyIndex, rest));
    }

  }

  isColliding () {
    const point = this;
    const game = point.game;

    return function ( players ) {
      const coords = point.coords;
      const scorerID = point.creator;

      if (point.armed) {
        point.countDown--;
      }
      const countDown = point.countDown;

      players.forEach(function ( player ) {
        if (player.id === point.creator) return point.alive;
        const body = player.body;

        player.body.forEach(function ( part, index ) {
          if (player.ghost) return;

          const distance = game.getDistance(part, coords);

          if (distance < point.blowRadius
            && (part[0] === coords[0]
              || part[1] === coords[1])) {

            point.arm();

            if (!point.countDown) {

              console.log(`${player.constructor.name} ${player.id} is blown to peaces by ${point.constructor.name} ${point.id}`);
              point.onCollision(player, index, scorerID);
            }
          }
        });
      });

      if (!countDown) point.die(1);
      return point.alive;
    }
  }
};
