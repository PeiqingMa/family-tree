package me.self.familytree.service

import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import org.junit.jupiter.api.Test

import org.junit.jupiter.api.Assertions.*

@MicronautTest
class FamilyTreeServiceTest(private val familyTreeService: FamilyTreeService) {

    @Test
    fun testAddRelation() {
        val name = "First ${System.nanoTime()}"
        val person = Person()
        person.names = listOf(name)
        person.bioGender = Gender.Male
        person.socialGender = person.bioGender?.name
        val saved = familyTreeService.addPerson(person)
        val firstId = saved?.id
        assertNotNull(firstId)
        assertTrue(saved?.names?.firstOrNull() == name)
        val another = Person()
        val anotherName = "Another ${System.nanoTime()}"
        another.names = listOf(anotherName)
        another.bioGender = Gender.Female
        another.socialGender = another.bioGender?.name
        val anotherSaved = familyTreeService.addPerson(another)
        val anotherId = anotherSaved?.id
        assertNotNull(anotherId)
        assertTrue(anotherSaved?.names?.firstOrNull() == anotherName)
        familyTreeService.addRelation(firstId!!, anotherId!!, FamilyRelations.Type.spouse)
        val updatedFirst = familyTreeService.findPerson(firstId)
        assertNotNull(updatedFirst?.spouses?.firstOrNull())
        assertTrue(updatedFirst?.spouses?.firstOrNull()?.anotherPerson?.names?.firstOrNull() == anotherName)
    }
}