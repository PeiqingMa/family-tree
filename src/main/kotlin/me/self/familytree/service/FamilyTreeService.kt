package me.self.familytree.service

import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.beans.SpouseRelation
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
            FamilyRelations.Type.bioFather -> currentPerson.bioFather = anotherPerson
            FamilyRelations.Type.bioMother -> currentPerson.bioMother = anotherPerson
            FamilyRelations.Type.parent -> currentPerson.parents = addNoDup(currentPerson.parents, anotherPerson)
            FamilyRelations.Type.child -> currentPerson.children = addNoDup(currentPerson.children, anotherPerson)
            FamilyRelations.Type.spouse -> {
                addSpouse(currentPerson, anotherPerson)
                return
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
    }

    fun addSpouse(currentPersonId: Long, anotherPersonId: Long, from: String?, end: String?) {
        val currentPerson = familyTreeDao.findPerson(currentPersonId)?: return
        val anotherPerson = familyTreeDao.findPerson(anotherPersonId)?: return
        addSpouse(currentPerson, anotherPerson, from, end)
    }

    private fun addSpouse(currentPerson: Person, anotherPerson: Person, from: String? = null, end: String? = null) {
        val relation = SpouseRelation().also {
            it.currentPerson = currentPerson
            it.anotherPerson = anotherPerson
            it.spouseFrom = from
            it.spouseEnd = end
        }
        val currentSpouses = currentPerson.spouses
        if (currentSpouses.isNullOrEmpty()) {
            currentPerson.spouses = listOf(relation)
        } else {
            val theSpouse = currentSpouses.filter {
                it.anotherPerson?.id != null && it.anotherPerson?.id == anotherPerson.id
            }.firstOrNull()
            if (theSpouse == null) {
                currentPerson.spouses = currentSpouses + relation
            } else {
                if (from != null && theSpouse.spouseFrom != from) {
                    theSpouse.spouseFrom = from
                }
                if (end != null && theSpouse.spouseEnd != end) {
                    theSpouse.spouseEnd = end
                }
            }
        }
        familyTreeDao.upsertPerson(currentPerson)
    }

    private fun addNoDup(list: List<Person>?, newPerson: Person): List<Person> {
        if (list.isNullOrEmpty()) return listOf(newPerson)
        val alreadyHas = list.any { it.id != null && it.id == newPerson.id }
        if (alreadyHas) return list
        return list + newPerson
    }
}
