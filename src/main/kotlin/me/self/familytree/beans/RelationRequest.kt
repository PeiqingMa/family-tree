package me.self.familytree.beans

import io.micronaut.core.annotation.Introspected

@Introspected
data class RelationRequest (
    val currentId: Long,
    val anotherId: Long,
    val relationType: FamilyRelations.Type,
    val parentType: String? = null,
    val childType: String? = null,
    var spouseFrom: String? = null,
    var spouseEnd: String? = null
)
