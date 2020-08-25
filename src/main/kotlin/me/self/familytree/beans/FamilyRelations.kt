package me.self.familytree.beans

import com.fasterxml.jackson.annotation.JsonBackReference
import org.neo4j.ogm.annotation.*

object FamilyRelations {
//    const val BIO_FATHER = "bio_father_is"
//    const val BIO_MOTHER = "bio_mother_is"
    const val PARENT = "parent_is"
    const val CHILD = "child_is"
    const val SPOUSE = "spouse_is"

    enum class Type(val label: String) {
//        BioFather(BIO_FATHER),
//        BioMother(BIO_MOTHER),
        Parent(PARENT),
        Child(CHILD),
        Spouse(SPOUSE),
//        All(""), // placeholder, should not be used in db
        ;
    }
}

@RelationshipEntity(value = FamilyRelations.SPOUSE)
class SpouseRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    var spouseFrom: String? = null
    var spouseEnd: String? = null
    @JsonBackReference
    @StartNode
    var currentPerson: Person? = null
    @EndNode
    var anotherPerson: Person? = null

    fun areSpouse(id1: Long, id2: Long): Boolean {
        return (this.currentPerson?.id == id1 && this.anotherPerson?.id == id2) ||
                (this.currentPerson?.id == id2 && this.anotherPerson?.id == id1)
    }
}

//@RelationshipEntity(value = FamilyRelations.BIO_FATHER)
class BioFatherRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    @StartNode
    var child: Person? = null
    @EndNode
    var father: Person? = null
}

//@RelationshipEntity(value = FamilyRelations.BIO_MOTHER)
class BioMotherRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    @StartNode
    var child: Person? = null
    @EndNode
    var mother: Person? = null
}

@RelationshipEntity(value = FamilyRelations.PARENT)
class ParentRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    var type: String? = null
    @JsonBackReference
    @StartNode
    var me: Person? = null
    @EndNode
    var parent: Person? = null
}

@RelationshipEntity(value = FamilyRelations.CHILD)
class ChildRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    var type: String? = null
    @JsonBackReference
    @StartNode
    var me: Person? = null
    @EndNode
    var child: Person? = null
}
