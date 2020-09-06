package me.self.familytree.beans

import io.micronaut.core.annotation.Introspected

abstract class RelationInfo {
    abstract val relationType: FamilyRelations.Type
    abstract val parentType: String?
    abstract val childType: String?
    abstract val spouseFrom: String?
    abstract val spouseEnd: String?
}

@Introspected
data class RelationRequest(
    val currentId: Long,
    val anotherId: Long,
    override val relationType: FamilyRelations.Type,
    override val parentType: String? = null,
    override val childType: String? = null,
    override var spouseFrom: String? = null,
    override var spouseEnd: String? = null
) : RelationInfo()

@Introspected
data class PersonWithRelationRequest(
    val currentId: Long,
    val anotherPerson: Person,
    override val relationType: FamilyRelations.Type,
    override val parentType: String? = null,
    override val childType: String? = null,
    override var spouseFrom: String? = null,
    override var spouseEnd: String? = null
) : RelationInfo()
