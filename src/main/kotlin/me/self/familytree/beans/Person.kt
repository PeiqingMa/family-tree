package me.self.familytree.beans

import com.fasterxml.jackson.annotation.JsonIdentityInfo
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonManagedReference
import com.fasterxml.jackson.annotation.ObjectIdGenerators
import org.neo4j.ogm.annotation.*

/**
 * JsonIdentityInfo JsonManagedReference and JsonBackReference(in SpouseRelation)
 * is used to solve circular reference problem:
 * https://www.baeldung.com/jackson-bidirectional-relationships-and-infinite-recursion
 */
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator::class, property = "id")
@NodeEntity
class Person {

    @Id
    @GeneratedValue
    var id: Long? = null
    @JsonIgnore
    @Index
    var allNames: String? = null
        private set
    var names: Set<String>? = null
        set(value) {
            field = value
            this.allNames = value?.joinToString(" ")
        }
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
        private set
    @JsonManagedReference
    @Relationship(value = FamilyRelations.SPOUSE, direction = Relationship.UNDIRECTED)
    var spouses: List<SpouseRelation>? = null
        private set
    @Relationship(value = FamilyRelations.CHILD)
    var children: List<Person>? = null
        private set

    fun addName(name: String) {
        names = if (names.isNullOrEmpty()) {
            setOf(name)
        } else {
            names!! + name
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
