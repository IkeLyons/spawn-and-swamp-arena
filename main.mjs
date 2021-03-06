import { getObjectsByPrototype, findInRange } from "/game/utils";
import { Creep, StructureSpawn, Source, StructureContainer } from "/game/prototypes";
import { MOVE, WORK, CARRY, ATTACK, HEAL, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from "/game/constants";

var workers = [];
var army = [];
var currentSquad = [];
var containers = [];
var mySpawn, enemySpawn;
var spawnDelay = 0;
var squadSize = 4;
var workerCount = 3;
var attackCreepBody = [MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK];
var healCreepBody = [MOVE, MOVE, MOVE, HEAL, HEAL];

function spawn() {
  if (workers.length < workerCount) {
    var worker = mySpawn.spawnCreep([MOVE, CARRY, MOVE]).object;
    if (worker) {
      workers.push(worker);
    }
  } else {
    var attackCreep;
    var typeCreated; // 0 - Attacker | 1 - Healer
    if (currentSquad.length < squadSize - 1) {
      attackCreep = mySpawn.spawnCreep(attackCreepBody).object;
    } else if (currentSquad.length < squadSize) {
      attackCreep = mySpawn.spawnCreep(healCreepBody).object;
    }
    if (attackCreep) {
      attackCreep.waitingForSquad = true;
      currentSquad.push(attackCreep);
      if (typeCreated == 0) {
        spawnDelay = attackCreepBody.length * 3;
      } else if (typeCreated == 1) {
        spawnDelay = healCreepBody.length * 3;
      }
    }
  }
}

function deploySquad(forced) {
  if (currentSquad.length >= squadSize || forced) {
    if (spawnDelay > 0) {
      spawnDelay--;
      return;
    }
    for (var creep of currentSquad) {
      creep.waitingForSquad = false;
    }

    army = army.concat(currentSquad);
    currentSquad = [];
  }
}

function getCloseEnergy(spawn, conts) {
  conts = findInRange(spawn, conts, 5);
  var energy = conts.reduce((n, { store }) => n + store[RESOURCE_ENERGY], 0);
  return energy;
}

function init() {
  mySpawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
  enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);
  workers = workers.filter((creep) => creep.exists);
  army = army.filter((creep) => creep.exists);
  containers = getObjectsByPrototype(StructureContainer);

  var remainingCloseEnergy = getCloseEnergy(mySpawn, containers);
  if (remainingCloseEnergy == 0) {
    deploySquad(true);
  } else {
    deploySquad(false);
  }
}

export function loop() {
  init();

  for (var worker of workers) {
    if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
      var nonEmptyConts = containers.filter((c) => c.store[RESOURCE_ENERGY] > 0);
      var container = worker.findClosestByPath(nonEmptyConts);
      if (worker.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        worker.moveTo(container);
      }
    } else {
      if (worker.transfer(mySpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        worker.moveTo(mySpawn);
      }
    }
  }

  var enemies = getObjectsByPrototype(Creep).filter((creep) => !creep.my);
  enemies.push(enemySpawn);
  for (var creep of army) {
    if (creep.waitingForSquad) {
      continue;
    }
    if (creep.body.some((bp) => bp.type == HEAL)) {
      var myDamagedCreeps = army.filter((i) => i.hits < i.hitsMax);
      var healTarget = creep.findClosestByPath(myDamagedCreeps);

      if (healTarget && creep.id != healTarget.id) {
        if (creep.heal(healTarget) == ERR_NOT_IN_RANGE) {
          creep.moveTo(healTarget);
        }
        continue;
      } else if (!healTarget) {
        var closestAlly = creep.findClosestByPath(army.filter((c) => c.id != creep.id));
        creep.moveTo(closestAlly);
      }
    }
    if (creep.body.some((bp) => bp.type == ATTACK)) {
      var enemy = creep.findClosestByPath(enemies);
      if (creep.attack(enemy) == ERR_NOT_IN_RANGE) {
        creep.moveTo(enemy);
      }
    }
  }

  spawn();
}
