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
    var photos: List<String>? = null
    @JsonManagedReference
    @Relationship(value = FamilyRelations.PARENT)
    var parents: List<ParentRelation>? = null
        private set
    @JsonManagedReference
    @Relationship(value = FamilyRelations.SPOUSE, direction = Relationship.UNDIRECTED)
    var spouses: List<SpouseRelation>? = null
        private set
    @JsonManagedReference
    @Relationship(value = FamilyRelations.CHILD)
    var children: List<ChildRelation>? = null
        private set

    fun addName(name: String) {
        names = if (names.isNullOrEmpty()) {
            setOf(name)
        } else {
            names!! + name
        }
    }

    fun addParent(parent: Person, type: String) {
        val relation = ParentRelation().also {
            it.me = this
            it.parent = parent
            it.type = type
        }
        val currentParents = this.parents
        if (currentParents.isNullOrEmpty()) {
            this.parents = listOf(relation)
        } else {
            val theParent = currentParents.filter {
                it.parent?.id != null && it.parent?.id == parent.id
            }.firstOrNull()
            if (theParent == null) {
                this.parents = currentParents + relation
            } else {
                if (theParent.type != type) {
                    theParent.type = type
                }
            }
        }
    }

    fun removeParent(id: Long) {
        this.parents = this.parents?.dropWhile { it.parent?.id == id }
    }

    fun addChild(child: Person, type: String) {
        val relation = ChildRelation().also {
            it.me = this
            it.child = child
            it.type = type
        }
        val currentChildren = this.children
        if (currentChildren.isNullOrEmpty()) {
            this.children = listOf(relation)
        } else {
            val theChild = currentChildren.filter {
                it.child?.id != null && it.child?.id == child.id
            }.firstOrNull()
            if (theChild == null) {
                this.children = currentChildren + relation
            } else {
                if (theChild.type != type) {
                    theChild.type = type
                }
            }
        }
    }

    fun removeChild(id: Long) {
        this.children = this.children?.dropWhile { it.child?.id == id }
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

    /**
     * return: true if successfully removed
     */
    fun removeSpouse(id1: Long, id2: Long): Boolean {
        val list = this.spouses
        this.spouses = if (list.isNullOrEmpty()) list
        else list.dropWhile { it.areSpouse(id1, id2) }
        return list?.size != this.spouses?.size
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
