package me.self.familytree.utils

import me.self.familytree.beans.*

fun Person.toView(): PersonView {
    return PersonView(
            id = this.id,
            names = this.names,
            bioGender = this.bioGender?.name,
            socialGender = this.socialGender?: this.bioGender?.name,
            lifeFrom = this.lifeFrom,
            lifeEnd = this.lifeEnd,
            birthPlace = this.birthPlace,
            deathPlace = this.deathPlace,
            details = this.details,
            photos = this.photos,
            parents = this.parents?.mapNotNull { it.toView() },
            spouses = this.spouses?.mapNotNull { it.toView(this.id) },
            children = this.children?.mapNotNull { it.toView() }
    )
}

fun Person.toViewList(): List<PersonView> {
    val map = HashMap<Long, PersonView>()
    val list = ArrayList<PersonView>()
    traversal(this, map, list)
    return list
}

private fun traversal(currentPerson: Person, map: MutableMap<Long, PersonView>, list: MutableList<PersonView>) {
    val currentId = currentPerson.id?: return
    if (map.containsKey(currentId)) return
    currentPerson.parents?.forEach { r-> r.parent?.also { traversal(it, map, list) } }
    val view = currentPerson.toView()
    map[currentId] = view
    list.add(view)
    currentPerson.spouses?.mapNotNull {
        when (currentId) {
            it.currentPerson?.id -> it.anotherPerson
            it.anotherPerson?.id -> it.currentPerson
            else -> null
        }
    }?.forEach { traversal(it, map, list) }
    currentPerson.children?.forEach { r-> r.child?.also { traversal(it, map, list) } }
}

fun ParentRelation.toView(): PersonInRelationView? {
    return PersonInRelationView(
            personId = this.parent?.id,
            relationId = this.id,
            type = this.type,
            names = this.parent?.names
    )
}

fun SpouseRelation.toView(currentId: Long?): PersonInRelationView? {
    val spouse = when (currentId) {
        null -> null
        this.currentPerson?.id -> this.anotherPerson
        this.anotherPerson?.id -> this.currentPerson
        else -> null
    }
    return if (spouse != null) PersonInRelationView(
            personId = spouse.id,
            relationId = this.id,
            names = spouse.names
    ) else null
}

fun ChildRelation.toView(): PersonInRelationView? {
    return PersonInRelationView(
            personId = this.child?.id,
            relationId = this.id,
            type = this.type,
            names = this.child?.names
    )
}
