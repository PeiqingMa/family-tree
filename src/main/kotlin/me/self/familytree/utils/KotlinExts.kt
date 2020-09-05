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
            parents = this.parents?.map { it.toView() }?.filterNotNull(),
            spouses = this.spouses?.map { it.toView(this.id) }?.filterNotNull(),
            children = this.children?.map { it.toView() }?.filterNotNull()
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
    map.put(currentId, view)
    list.add(view)
    currentPerson.spouses?.map {
        if (currentId == it.currentPerson?.id) it.anotherPerson
        else if (currentId == it.anotherPerson?.id) it.currentPerson
        else null
    }?.filterNotNull()?.forEach { traversal(it, map, list) }
    currentPerson.children?.forEach { r-> r.child?.also { traversal(it, map, list) } }
}

fun ParentRelation.toView(): PersonInRelationView? {
    return PersonInRelationView(
            personId = this.parent?.id,
            type = this.type,
            names = this.parent?.names
    )
}

fun SpouseRelation.toView(currentId: Long?): PersonInRelationView? {
    val spouse = if (currentId == null) null
                 else if (currentId == this.currentPerson?.id) this.anotherPerson
                 else if (currentId == this.anotherPerson?.id) this.currentPerson
                 else null
    return if (spouse != null) PersonInRelationView(
            personId = spouse.id,
//            type = this.type,
            names = spouse.names
    ) else null
}

fun ChildRelation.toView(): PersonInRelationView? {
    return PersonInRelationView(
            personId = this.child?.id,
            type = this.type,
            names = this.child?.names
    )
}
