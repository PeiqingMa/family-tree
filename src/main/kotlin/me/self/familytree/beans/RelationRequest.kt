package me.self.familytree.beans

import io.micronaut.core.annotation.Introspected

@Introspected
data class RelationRequest (
    val currentId: Long,
    val anotherId: Long,
    val relationType: FamilyRelations.Type,
    var spouseFrom: String? = null,
    var spouseEnd: String? = null
)
