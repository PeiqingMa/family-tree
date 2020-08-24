package me.self.familytree.service

import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.dao.FamilyTreeDao
import java.lang.IllegalArgumentException
import java.lang.RuntimeException
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

    fun addRelation(currentPersonId: Long, anotherPersonId: Long, relation: FamilyRelations.Type) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        when (relation) {
            FamilyRelations.Type.BioFather -> {
                currentPerson.bioFather = anotherPerson
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.BioMother -> {
                currentPerson.bioMother = anotherPerson
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.Parent -> {
                currentPerson.addParent(anotherPerson)
                anotherPerson.addChild(currentPerson)
            }
            FamilyRelations.Type.Child -> {
                currentPerson.addChild(anotherPerson)
                anotherPerson.addParent(currentPerson)
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
            FamilyRelations.Type.BioFather -> {
                if (currentPerson.bioFather?.id == anotherPersonId) {
                    currentPerson.bioFather = null
                }
            }
            FamilyRelations.Type.BioMother -> {
                if (currentPerson.bioMother?.id == anotherPersonId) {
                    currentPerson.bioMother = null
                }
            }
            FamilyRelations.Type.Parent -> {
                currentPerson.removeParent(anotherPersonId)
            }
            FamilyRelations.Type.Child -> {
                currentPerson.removeChild(anotherPersonId)
            }
            FamilyRelations.Type.Spouse -> {
                currentPerson.removeSpouse(currentPersonId, anotherPersonId)
                val removed = anotherPerson.removeSpouse(currentPersonId, anotherPersonId)
                if (removed) {
                    familyTreeDao.upsertPerson(anotherPerson)
                }
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
    }

    fun addSpouse(currentPersonId: Long, anotherPersonId: Long, from: String?, end: String?) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        currentPerson.addSpouse(anotherPerson, from, end)
//        anotherPerson.addSpouse(currentPerson, from, end)
        familyTreeDao.upsertPerson(currentPerson)
    }
}
