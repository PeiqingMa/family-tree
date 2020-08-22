package me.self.familytree.beans

import org.neo4j.ogm.annotation.GeneratedValue
import org.neo4j.ogm.annotation.Id
import org.neo4j.ogm.annotation.NodeEntity
import org.neo4j.ogm.annotation.Relationship

@NodeEntity
class Person {
    @Id
    @GeneratedValue
    var id: Long? = null
    var names: Set<String>? = null
    var bioGender: Gender? = null
        set(value) {
            field = value
            if (this.socialGender == null) {
                value?.also { this.socialGender = it.name }
            }
        }
    var socialGender: String? = null
    var lifeFrom: String? = null
    var lifeEnd: String? = null
    var birthPlace: String? = null
    var deathPlace: String? = null
    var details: String? = null
    @Relationship(value = FamilyRelations.BIO_FATHER)
    var bioFather: Person? = null
    @Relationship(value = FamilyRelations.BIO_MOTHER)
    var bioMother: Person? = null
    @Relationship(value = FamilyRelations.PARENT)
    var parents: List<Person>? = null
    @Relationship(value = FamilyRelations.SPOUSE, direction = Relationship.UNDIRECTED)
    var spouses: List<SpouseRelation>? = null
    @Relationship(value = FamilyRelations.CHILD)
    var children: List<Person>? = null

    fun addName(name: String) {
        if (names.isNullOrEmpty()) {
            names = setOf(name)
        } else {
            names = names!! + name
        }
    }

    fun addParent(parent: Person) {
        this.parents = addListNoDup(this.parents, parent)
    }

    fun addChild(child: Person) {
        this.children = addListNoDup(this.children, child)
    }

    fun addSpouse(spouse: Person, from: String? = null, end: String? = null) {
        val relation = SpouseRelation().also {
            it.currentPerson = this
            it.anotherPerson = spouse
            it.spouseFrom = from
            it.spouseEnd = end
        }
        val currentSpouses = this.spouses
        if (currentSpouses.isNullOrEmpty()) {
            this.spouses = listOf(relation)
        } else {
            val theSpouse = currentSpouses.filter {
                it.anotherPerson?.id != null && it.anotherPerson?.id == spouse.id
            }.firstOrNull()
            if (theSpouse == null) {
                this.spouses = currentSpouses + relation
            } else {
                if (from != null && theSpouse.spouseFrom != from) {
                    theSpouse.spouseFrom = from
                }
                if (end != null && theSpouse.spouseEnd != end) {
                    theSpouse.spouseEnd = end
                }
            }
        }
    }

    private fun addListNoDup(list: List<Person>?, newPerson: Person): List<Person> {
        if (list.isNullOrEmpty()) return listOf(newPerson)
        val alreadyHas = list.any { it.id != null && it.id == newPerson.id }
        if (alreadyHas) return list
        return list + newPerson
    }

}

class PersonName {
    var familyName: String? = null
    var givenName: String? = null
    var middleName: String? = null
    var fullName: String? = null
    var nameType: String? = null
    var nameOrder: NameOrder = NameOrder.FamilyNameFirst

    companion object {
        fun familyNameFirst(f: String, g: String): PersonName {
            val n = PersonName()
            n.familyName = f
            n.givenName = g
            n.fullName = f + g
            return n
        }
    }
}

enum class NameOrder {
    FamilyNameFirst,
    GivenNameFirst,
    ;
}

enum class Gender {
    Male,
    Female,
    Other,
    Unknown,
}
