package me.self.familytree.beans

data class PersonView(
        val id: Long?,
        val names: List<String>?,
        val bioGender: String?,
        val socialGender: String?,
        val lifeFrom: String? = null,
        val lifeEnd: String? = null,
        val birthPlace: String? = null,
        val deathPlace: String? = null,
        val details: String? = null,
        val photos: List<String>? = null,
        val parents: List<PersonInRelationView>? = null,
        val spouses: List<PersonInRelationView>? = null,
        val children: List<PersonInRelationView>? = null
)

data class PersonInRelationView(
        val personId: Long?,
        val relationId: Long? = null,
        val type: String? = null,
        val names: List<String>?
)
