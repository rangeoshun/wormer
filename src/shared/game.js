"use strict";
const Tick = require('./tick.js');
const Point = require('./point.js');
const GoldenPoint = require('./golden-point.js');
const MinePoint = require('./mine-point.js');
const PickupMinePoint = require('./pickup-mine-point.js');
const GhostPoint = require('./ghost-point.js');
const PortalPoint = require('./portal-point.js');
const InvisiblePoint = require('./invisible-point.js');
const DrillPoint = require('./drill-point.js');
const Worm = require('./worm.js');

module.exports = class Game {
  constructor ( server, globals ) {
    const game = this;
    let points = game.points = [];
    let players = game.players = [];
    let syncCallbacks = game.syncCallbacks = [];
    let tick = game.tick = new Tick(game);
    game.globals = globals;
    game.server = server;
    game.previousState = {};
    game.paused = false;
    if (!game.server) game.allTimeHigh = [];

    if (server) {
      let correctPoints = function () {
        let pointCount = 0;
        game.points.forEach(function ( point ) {
          if (!point.creator) pointCount++;
        });
        if (pointCount < 300) {
          game.addPoint();
        }
      }

      let cleanup = function () {
        //  console.timeEnd(`Sync takes`);
        game.ditchTheDead();
      }

      let syncPlayers = ( player ) => {
        //  console.time(`Sync takes`);
        let state = game.getState();
        game.syncCallbacks.forEach(( callback, index ) => {
          if (callback.del) {
            game.syncCallbacks.splice(index, 1);
            return;
          }

          if (callback(state) === false) {
            callback.del = true;
          }
        });
      }

      tick.afterCallbacks.push(syncPlayers);
      tick.afterCallbacks.push(cleanup);
      tick.afterCallbacks.push(correctPoints);
    }

    tick.init(true);
  }

  togglePause () {
    const game = this;
    game.paused = !game.paused;
  }

  getRandomPoint () {
    const factor = Math.round(Math.random() * 34);

    if (factor > 32) {
      return InvisiblePoint;
    } else if (factor > 31) {
      return DrillPoint;
    } else if (factor > 30) {
      return PortalPoint;
    } else if (factor > 29) {
      return GhostPoint;
    } else if (factor > 27) {
      return PickupMinePoint;
    } else if (factor > 24) {
      return GoldenPoint;
    } else {
      return Point;
    }
  }

  addPoint ( type ) {
    const game = this;
    const Type = type || game.getRandomPoint();
    let point = new Type(game);

    game.points.push(point);

    return point;
  }

  addPlayer () {
    const game = this;
    let player = new Worm(game);

    game.players.push(player);

    return player;
  }

  getPointById ( id ) {
    const game = this;
    let foundPoint = null;

    game.points.forEach(( point ) => {
      if (id !== point.id) return;
      foundPoint = point;
    });

    return foundPoint;
  }

  getPlayerById ( id ) {
    const game = this;
    let foundPlayer = null;

    game.players.forEach(( player ) => {
      if (id !== player.id) return;
      foundPlayer = player;
    });

    return foundPlayer;
  }

  getState ( fullState ) {
    const game = this;
    let state = {};
    state.t = new Date().getTime();
    if (game.allTimeHigh && (game.allTimeHigh.updated || fullState)) {
      state.ath = game.allTimeHigh;
      game.allTimeHigh.updated = fullState;
    }
    state.sc = [];
    game.globals.players.forEach(function ( player ) {
      state.sc.push({
        id: player.id,
        nm: player.name,
        so: player.score,
        cl: player.color,
        da: player.entity.alive,
        pn: player.ping || '-'
      });
    });

    game.points.forEach(function ( point ) {
      if (!fullState && !point.updated) return;
      if (!state.hasOwnProperty('pi')) state.pi = {};
      let pointState = {};

      if (point.alive) {

        if (point.creatorUpdated || fullState) {
          pointState.ce = point.creator;
          point.creatorUpdated = fullState;
        }

        if (point.colorUpdated || fullState) {
          pointState.cl = point.color;
          point.colorUpdated = fullState;
        }

        if (point.nameUpdated || fullState) {
          pointState.nm = point.name;
          point.nameUpdated = fullState;
        }

        if (point.typeUpdated || fullState) {
          pointState.tp = point.type;
          point.typeUpdated = fullState;
        }

        if (point.coordsUpdated || fullState) {
          pointState.co = point.coords;
          point.coordsUpdated = fullState;
        }

        if (point.armedUpdated || fullState) {
          pointState.am = point.armed;
          point.armedUpdated = fullState;
        }

        if (point.ghost || fullState) {
          pointState.go = point.ghost;
          point.ghostUpdated = fullState;
        }
      } else {
        pointState.de = point.killerID;
      }

      state.pi[point.id] = pointState;
      point.updated = fullState;
    });

    game.players.forEach(function ( player ) {
      if (!fullState && player.updated === false) return;
      if (!state.hasOwnProperty('pa')) state.pa = {};
      let playerState = {};

      if (player.alive) {

        if (player.drillUpdated || fullState) {
          playerState.di = player.drill;
          player.drillUpdated = fullState;
        }

        if (player.invisibleUpdated || fullState) {
          playerState.iv = player.invisible;
          player.invisibleUpdated = fullState;
        }

        if (player.abilitiesUpdated || fullState) {
          playerState.aim = player.abilitiesMessage;
          player.abilitiesUpdated = fullState;
        }

        if (player.colorUpdated || fullState) {
          playerState.cl = player.color;
          player.colorUpdated = fullState;
        }

        if (player.bodyUpdated || fullState) {
          playerState.bd = player.body[0];
          playerState.bdln = player.body.length;
          player.bodyUpdated = fullState;
        }

        if (player.nameUpdated || fullState) {
          playerState.nm = player.name;
          player.nameUpdated = fullState;
        }

        if (player.ghostUpdated || fullState) {
          playerState.go = player.ghost;
          player.ghostUpdated = fullState;
        }
      } else {
        playerState.de = 1;
      }

      if (player.messageUpdated || fullState) {
        playerState.ms = player.message;
        player.messageUpdated = fullState;
      }

      state.pa[player.id] = playerState;
      player.updated = fullState;
    });

    return state;
  }

  ditchTheDead () {
    const game = this;

    game.points = game.points.filter(function ( point ) {
      return point ? point.alive : false;
    });
    game.players = game.players.filter(function ( player ) {
      return player ? player.alive : false;
    });
  }

  areColliding ( v1, v2, strict, player ) {
    const game = this;

    if (strict) {
      return (v1[0] === v2[0] && v1[1] === v2[1]);
    } else {
      const resolution = game.globals.resolution;

      const distance = player ? player.getPickDistance() : 4;
      const verdict = this.getDistance(v1, v2) < distance
        || this.getDistance([v1[0] - resolution[0], v1[1]], v2) < distance
        || this.getDistance([v1[0] + resolution[0], v1[1]], v2) < distance
        || this.getDistance([v1[0], v1[1] - resolution[1]], v2) < distance
        || this.getDistance([v1[0], v1[1] + resolution[1]], v2) < distance;

      return verdict;
    }
  }

  getDistance ( v1, v2 ) {
    const a = Math.pow(Math.max(v1[0], v2[0]) - Math.min(v1[0], v2[0]), 2);
    const b = Math.pow(Math.max(v1[1], v2[1]) - Math.min(v1[1], v2[1]), 2);
    return Math.round(Math.sqrt(a + b));
  }
};
