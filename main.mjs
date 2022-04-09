import { getObjectsByPrototype } from "/game/utils";
import { Creep, StructureSpawn, Source, StructureContainer } from "/game/prototypes";
import { MOVE, WORK, CARRY, ATTACK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from "/game/constants";

var workers = [];
var attackCreeps = [];
var mySpawn, enemySpawn;

function spawn() {
    if (workers.length < 2) {
        var worker = mySpawn.spawnCreep([MOVE, WORK, CARRY]).object;
        if (worker) {
            workers.push(worker);
        }
    } else {
        var attackCreep = mySpawn.spawnCreep([MOVE, ATTACK]).object;
        if (attackCreep) {
            attackCreeps.push(attackCreep);
        }
    }
}

function init() {
    mySpawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
    enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);
}

export function loop() {
    init();
    spawn();

    for (var worker of workers) {
        if (worker.store.getFreeCapacity(RESOURCE_ENERGY)) {
            var container = worker.findClosestByPath(getObjectsByPrototype(StructureContainer));
            console.log(container);
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
    for (var creep of attackCreeps) {
        // if (creep.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
        //     creep.moveTo(enemySpawn);
        // }
        var enemy = creep.findClosestByPath(enemies);
        if (creep.attack(enemy) == ERR_NOT_IN_RANGE) {
            creep.moveTo(enemy);
        }
    }
}
