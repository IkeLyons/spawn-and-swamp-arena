import { getObjectsByPrototype } from "/game/utils";
import { Creep, StructureSpawn, Source, StructureContainer } from "/game/prototypes";
import { MOVE, WORK, CARRY, ATTACK, HEAL, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from "/game/constants";

var workers = [];
var army = [];
var currentSquad = [];
var mySpawn, enemySpawn;

function spawn() {
    if (workers.length < 2) {
        var worker = mySpawn.spawnCreep([MOVE, WORK, CARRY]).object;
        if (worker) {
            workers.push(worker);
        }
    } else {
        if (currentSquad.length < 2) {
            var attackCreep = mySpawn.spawnCreep([MOVE, ATTACK]).object;
            if (attackCreep) {
                attackCreep.waitingForSquad = true;
                currentSquad.push(attackCreep);
                army.push(attackCreep);
            }
        } else {
            let attackCreep = mySpawn.spawnCreep([MOVE, HEAL]).object;

            if (attackCreep) {
                for (var c of currentSquad) {
                    c.waitingForSquad = false;
                }
                attackCreep.waitingForSquad = false;
                army.push(attackCreep);
                currentSquad = [];
            }
        }
    }
}

function init() {
    mySpawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
    enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);
    army = army.filter((creep) => creep.exists);
}

export function loop() {
    init();

    for (var worker of workers) {
        if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
            var container = worker.findClosestByPath(getObjectsByPrototype(StructureContainer));
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
        if (creep.body.some((bp) => bp.type == ATTACK)) {
            var enemy = creep.findClosestByPath(enemies);
            if (creep.attack(enemy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(enemy);
            }
        }

        if (creep.body.some((bp) => bp.type == HEAL)) {
            var myDamagedCreeps = army.filter((i) => i.hits < i.hitsMax);
            var healTarget = creep.findClosestByPath(myDamagedCreeps);
            if (healTarget) {
                if (creep.heal(healTarget) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(healTarget);
                }
            } else {
                var enemy = creep.findClosestByPath(enemies);
                creep.moveTo(enemy);
            }
        }
    }

    spawn();
}
