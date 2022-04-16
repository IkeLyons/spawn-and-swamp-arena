import { getObjectsByPrototype } from "/game/utils";
import { Creep, StructureSpawn, Source, StructureContainer } from "/game/prototypes";
import { MOVE, WORK, CARRY, ATTACK, HEAL, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from "/game/constants";

var workers = [];
var army = [];
var currentSquad = [];
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
        if (currentSquad.length < squadSize - 1) {
            attackCreep = mySpawn.spawnCreep(attackCreepBody).object;
            spawnDelay = attackCreepBody.length * 3;
        } else if (currentSquad.length < squadSize) {
            attackCreep = mySpawn.spawnCreep(healCreepBody).object;
            spawnDelay = healCreepBody.length * 3;
        }
        if (attackCreep) {
            attackCreep.waitingForSquad = true;
            currentSquad.push(attackCreep);
        }
    }
}

function init() {
    mySpawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
    enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);
    workers = workers.filter((creep) => creep.exists);
    army = army.filter((creep) => creep.exists);
    if (currentSquad.length >= squadSize) {
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

export function loop() {
    init();

    for (var worker of workers) {
        if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
            var nonEmptyConts = getObjectsByPrototype(StructureContainer).filter((c) => c.store[RESOURCE_ENERGY] > 0);
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
