package me.self.familytree.service

import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.dao.FamilyTreeDao
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FamilyTreeService(
        @Inject val familyTreeDao: FamilyTreeDao
) {

    fun findPerson(personId: Long): Person? {
        return familyTreeDao.findPerson(personId)
    }

    fun addPerson(person: Person): Person? {
        return familyTreeDao.upsertPerson(person)
    }

    fun addRelation(currentPersonId: Long, anotherPersonId: Long, relation: FamilyRelations.Type) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        when (relation) {
            FamilyRelations.Type.bioFather -> {
                currentPerson.bioFather = anotherPerson
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.bioMother -> {
                currentPerson.bioMother = anotherPerson
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.parent -> {
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.child -> {
                currentPerson.addChild(anotherPerson)
                anotherPerson.addParent(currentPerson)
            }
            FamilyRelations.Type.spouse -> {
                currentPerson.addSpouse(anotherPerson)
                anotherPerson.addSpouse(currentPerson)
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
    }

    fun addSpouse(currentPersonId: Long, anotherPersonId: Long, from: String?, end: String?) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        currentPerson.addSpouse(anotherPerson, from, end)
        anotherPerson.addSpouse(currentPerson, from, end)
        familyTreeDao.upsertPerson(currentPerson)
    }
}
