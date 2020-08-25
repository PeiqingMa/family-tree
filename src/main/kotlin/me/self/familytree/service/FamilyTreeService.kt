package me.self.familytree.service

import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.beans.RelationRequest
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
        return familyTreeDao.upsertPersonProperties(person)
    }

    fun addRelation(relationRequest: RelationRequest) {
        val currentPerson = familyTreeDao.findPerson(relationRequest.currentId)?: return
        val anotherPerson = familyTreeDao.findPerson(relationRequest.anotherId)?: return
        when (relationRequest.relationType) {
            FamilyRelations.Type.Parent -> {
                currentPerson.addParent(anotherPerson, relationRequest.parentType!!)
                anotherPerson.addChild(currentPerson, relationRequest.childType!!)
            }
            FamilyRelations.Type.Child -> {
                currentPerson.addChild(anotherPerson, relationRequest.childType!!)
                anotherPerson.addParent(currentPerson, relationRequest.parentType!!)
            }
            FamilyRelations.Type.Spouse -> {
                currentPerson.addSpouse(anotherPerson)
//                anotherPerson.addSpouse(currentPerson)
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
    }

    fun removeRelation(currentPersonId: Long, anotherPersonId: Long, relation: FamilyRelations.Type) {
        val currentPerson = familyTreeDao.findPersonWithSecondRelation(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPersonWithSecondRelation(anotherPersonId)?: return
        when (relation) {
            FamilyRelations.Type.Parent -> {
                currentPerson.removeParent(anotherPersonId)
                anotherPerson.removeChild(currentPersonId)
            }
            FamilyRelations.Type.Child -> {
                currentPerson.removeChild(anotherPersonId)
                anotherPerson.removeParent(currentPersonId)
            }
            FamilyRelations.Type.Spouse -> {
                currentPerson.removeSpouse(currentPersonId, anotherPersonId)
                anotherPerson.removeSpouse(currentPersonId, anotherPersonId)
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
        familyTreeDao.upsertPerson(anotherPerson)
    }

    fun addSpouse(currentPersonId: Long, anotherPersonId: Long, from: String?, end: String?) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        currentPerson.addSpouse(anotherPerson, from, end)
//        anotherPerson.addSpouse(currentPerson, from, end)
        familyTreeDao.upsertPerson(currentPerson)
    }
}
