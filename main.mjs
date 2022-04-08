import { getObjectsByPrototype } from "/game/utils";
import { Creep, StructureSpawn, Source, StructureContainer } from "/game/prototypes";
import { MOVE, WORK, CARRY, ATTACK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from "/game/constants";

var worker;
var attackCreeps = [];

export function loop() {
    var mySpawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
    var enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);

    if (!worker) {
        worker = mySpawn.spawnCreep([MOVE, WORK, CARRY]).object;
    } else {
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

        var attackCreep = mySpawn.spawnCreep([MOVE, ATTACK]).object;
        var enemies = getObjectsByPrototype(Creep).filter((creep) => !creep.my);
        if (attackCreep) {
            attackCreeps.push(attackCreep);
        }
        for (var creep of attackCreeps) {
            if (creep.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
                creep.moveTo(enemySpawn);
            }
            // var enemyCreep = creep.findClosestByPath(enemies);
            // if (creep.attack(enemyCreep) == ERR_NOT_IN_RANGE) {
            //     creep.moveTo(enemyCreep);
            // }
        }
    }
}
