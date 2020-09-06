package me.self.familytree.service

import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import me.self.familytree.beans.RelationRequest
import me.self.familytree.utils.toViewList
import org.junit.jupiter.api.Test

import org.junit.jupiter.api.Assertions.*

@MicronautTest
class FamilyTreeServiceTest(private val familyTreeService: FamilyTreeService) {

    var firstPersonId: Long? = null
    var secondPersonId: Long? = null

    @Test
    fun testAddRelation() {
        val name = "First ${System.nanoTime()}"
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val saved = familyTreeService.addPerson(person)
        val firstId = saved?.id
        assertNotNull(firstId)
        assertTrue(saved?.names?.firstOrNull() == name)
        firstPersonId = firstId
        val another = Person()
        val anotherName = "Another ${System.nanoTime()}"
        another.addName(anotherName)
        another.bioGender = Gender.Female
        val anotherSaved = familyTreeService.addPerson(another)
        val anotherId = anotherSaved?.id
        assertNotNull(anotherId)
        assertTrue(anotherSaved?.names?.firstOrNull() == anotherName)
        secondPersonId = anotherId
        val relationRequest = RelationRequest(
                firstId!!,
                anotherId!!,
                FamilyRelations.Type.Parent,
        )
        familyTreeService.addRelation(relationRequest)
        val updatedFirst = familyTreeService.findPerson(firstId)
        assertNotNull(updatedFirst?.parents?.firstOrNull())
        assertTrue(updatedFirst?.parents?.firstOrNull()?.parent?.names?.firstOrNull() == anotherName)
    }

    @Test
    fun testDeleteRelation() {
        testAddRelation()
        assertNotNull(firstPersonId)
        assertNotNull(secondPersonId)
        val person = familyTreeService.findPerson(secondPersonId!!)
        assertNotNull(person)
        assertTrue(person?.children?.firstOrNull()?.child?.id == firstPersonId)
        familyTreeService.removeRelation(firstPersonId!!, secondPersonId!!, FamilyRelations.Type.Parent)
        val updated = familyTreeService.findPerson(secondPersonId!!)
        assertNotNull(updated)
        assertNull(updated?.children?.firstOrNull())
    }

    @Test
    fun testFlatten() {
        val person1 = Person()
        person1.id = 1L
        person1.addName("Aaa")
        person1.bioGender = Gender.Male
        val person2 = Person()
        person2.id = 2L
        person2.addName("Bbb")
        person2.bioGender = Gender.Female
        person1.addParent(person2)
        person2.addChild(person1)
        val list = person1.toViewList()
        println(list)
        assertTrue(list.size == 2)
    }
}
