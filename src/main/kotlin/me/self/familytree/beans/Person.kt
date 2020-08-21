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
    var names: List<String>? = null
    var bioGender: Gender? = null
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
