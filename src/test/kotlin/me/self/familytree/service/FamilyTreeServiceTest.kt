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
        person.addName(name)
        person.bioGender = Gender.Male
        val saved = familyTreeService.addPerson(person)
        val firstId = saved?.id
        assertNotNull(firstId)
        assertTrue(saved?.names?.firstOrNull() == name)
        val another = Person()
        val anotherName = "Another ${System.nanoTime()}"
        another.addName(anotherName)
        another.bioGender = Gender.Female
        val anotherSaved = familyTreeService.addPerson(another)
        val anotherId = anotherSaved?.id
        assertNotNull(anotherId)
        assertTrue(anotherSaved?.names?.firstOrNull() == anotherName)
        familyTreeService.addRelation(firstId!!, anotherId!!, FamilyRelations.Type.bioMother)
        val updatedFirst = familyTreeService.findPerson(firstId)
        assertNotNull(updatedFirst?.bioMother)
        assertNotNull(updatedFirst?.parents?.firstOrNull())
        assertTrue(updatedFirst?.parents?.firstOrNull()?.names?.firstOrNull() == anotherName)
    }
}