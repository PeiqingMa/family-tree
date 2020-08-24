package me.self.familytree.beans

import com.fasterxml.jackson.annotation.JsonIdentityInfo
import com.fasterxml.jackson.annotation.ObjectIdGenerators
import org.neo4j.ogm.annotation.*

object FamilyRelations {
    const val BIO_FATHER = "bio_father_is"
    const val BIO_MOTHER = "bio_mother_is"
    const val PARENT = "parent_is"
    const val CHILD = "child_is"
    const val SPOUSE = "spouse_is"

    enum class Type {
        bioFather,
        bioMother,
        parent,
        child,
        spouse,
    }
}

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator::class, property = "id")
@RelationshipEntity(value = FamilyRelations.SPOUSE)
class SpouseRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    var spouseFrom: String? = null
    var spouseEnd: String? = null
    @StartNode
    var currentPerson: Person? = null
    @EndNode
    var anotherPerson: Person? = null
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

//@RelationshipEntity(value = FamilyRelations.PARENT)
class ParentRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    @StartNode
    var child: Person? = null
    @EndNode
    var parent: Person? = null
}

//@RelationshipEntity(value = FamilyRelations.CHILD)
class ChildRelation {
    @Id
    @GeneratedValue
    var id: Long? = null
    @StartNode
    var parent: Person? = null
    @EndNode
    var child: Person? = null
}
